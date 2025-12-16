// 绑定关系管理云函数
// 支持：创建绑定、删除绑定、查询绑定、批量操作、验证绑定关系
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 获取当前用户信息
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const currentUser = userResult.data[0]
    const isAdmin = ['Admin', 'SuperAdmin'].includes(currentUser.role)

    const { action } = event

    switch (action) {
      case 'create':
        return await createBinding(event, currentUser, isAdmin)
      case 'delete':
        return await deleteBinding(event, currentUser, isAdmin)
      case 'query':
        return await queryBindings(event, currentUser, isAdmin)
      case 'batch_create':
        return await batchCreateBindings(event, currentUser, isAdmin)
      case 'batch_delete':
        return await batchDeleteBindings(event, currentUser, isAdmin)
      case 'validate':
        return await validateBindings(event, currentUser, isAdmin)
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (err) {
    console.error('绑定管理失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 创建绑定关系
async function createBinding(event, currentUser, isAdmin) {
  const { bossId, staffId } = event

  // 验证权限
  if (!isAdmin) {
    return {
      success: false,
      error: '只有管理员可以创建绑定关系'
    }
  }

  // 验证参数
  if (!bossId || !staffId) {
    return {
      success: false,
      error: '老板ID和员工ID不能为空'
    }
  }

  if (bossId === staffId) {
    return {
      success: false,
      error: '老板和员工不能是同一个人'
    }
  }

  // 验证用户存在且角色正确
  const [bossResult, staffResult] = await Promise.all([
    db.collection('users').where({ _openid: bossId }).get(),
    db.collection('users').where({ _openid: staffId }).get()
  ])

  if (bossResult.data.length === 0 || bossResult.data[0].role !== 'Boss') {
    return {
      success: false,
      error: '指定的老板不存在或角色不正确'
    }
  }

  if (staffResult.data.length === 0 || staffResult.data[0].role !== 'Staff') {
    return {
      success: false,
      error: '指定的员工不存在或角色不正确'
    }
  }

  // 检查是否已存在绑定
  const existingBinding = await db.collection('bindings').where({
    bossId,
    staffId,
    status: 'active'
  }).get()

  if (existingBinding.data.length > 0) {
    return {
      success: false,
      error: '绑定关系已存在'
    }
  }

  // 创建绑定关系
  const binding = {
    bossId,
    staffId,
    status: 'active',
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
    creatorId: currentUser._openid
  }

  const result = await db.collection('bindings').add({
    data: binding
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...binding
    }
  }
}

// 删除绑定关系
async function deleteBinding(event, currentUser, isAdmin) {
  const { bindingId } = event

  // 验证权限
  if (!isAdmin) {
    return {
      success: false,
      error: '只有管理员可以删除绑定关系'
    }
  }

  // 验证参数
  if (!bindingId) {
    return {
      success: false,
      error: '绑定ID不能为空'
    }
  }

  // 检查绑定是否存在
  const bindingResult = await db.collection('bindings').doc(bindingId).get()
  if (!bindingResult.data || bindingResult.data.length === 0) {
    return {
      success: false,
      error: '绑定关系不存在'
    }
  }

  // 更新绑定状态为inactive
  await db.collection('bindings').doc(bindingId).update({
    data: {
      status: 'inactive',
      updateTime: db.serverDate(),
      updaterId: currentUser._openid
    }
  })

  return {
    success: true,
    message: '绑定关系已删除'
  }
}

// 查询绑定关系
async function queryBindings(event, currentUser, isAdmin) {
  const { bossId, staffId, status = 'active', page = 1, pageSize = 20 } = event
  const skip = (page - 1) * pageSize

  let query = db.collection('bindings')

  // 构建查询条件
  const whereCondition = { status }

  if (bossId) {
    whereCondition.bossId = bossId
  }

  if (staffId) {
    whereCondition.staffId = staffId
  }

  // 非管理员只能查询自己的绑定关系
  if (!isAdmin) {
    if (currentUser.role === 'Boss') {
      whereCondition.bossId = currentUser._openid
    } else if (currentUser.role === 'Staff') {
      whereCondition.staffId = currentUser._openid
    } else {
      return {
        success: false,
        error: '无权限查询绑定关系'
      }
    }
  }

  query = query.where(whereCondition)

  // 执行查询
  const queryResult = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await query.count()

  // 获取用户信息用于填充
  const bindings = []
  for (const binding of queryResult.data) {
    const [bossInfo, staffInfo] = await Promise.all([
      db.collection('users').where({ _openid: binding.bossId }).get(),
      db.collection('users').where({ _openid: binding.staffId }).get()
    ])

    bindings.push({
      ...binding,
      bossInfo: bossInfo.data.length > 0 ? {
        nickname: bossInfo.data[0].nickname,
        userId: bossInfo.data[0].userId,
        avatar: bossInfo.data[0].avatar
      } : { nickname: '未知', userId: '', avatar: null },
      staffInfo: staffInfo.data.length > 0 ? {
        nickname: staffInfo.data[0].nickname,
        userId: staffInfo.data[0].userId,
        avatar: staffInfo.data[0].avatar
      } : { nickname: '未知', userId: '', avatar: null }
    })
  }

  return {
    success: true,
    data: {
      bindings,
      total: countResult.total,
      page,
      pageSize
    }
  }
}

// 批量创建绑定关系
async function batchCreateBindings(event, currentUser, isAdmin) {
  const { bindings } = event

  // 验证权限
  if (!isAdmin) {
    return {
      success: false,
      error: '只有管理员可以批量创建绑定关系'
    }
  }

  // 验证参数
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return {
      success: false,
      error: '绑定列表不能为空'
    }
  }

  if (bindings.length > 50) {
    return {
      success: false,
      error: '单次最多只能创建50个绑定关系'
    }
  }

  const results = []
  const errors = []

  for (const binding of bindings) {
    try {
      const result = await createBinding({
        bossId: binding.bossId,
        staffId: binding.staffId
      }, currentUser, isAdmin)

      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({
          binding,
          error: result.error
        })
      }
    } catch (err) {
      errors.push({
        binding,
        error: err.message
      })
    }
  }

  return {
    success: true,
    data: {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    }
  }
}

// 批量删除绑定关系
async function batchDeleteBindings(event, currentUser, isAdmin) {
  const { bindingIds } = event

  // 验证权限
  if (!isAdmin) {
    return {
      success: false,
      error: '只有管理员可以批量删除绑定关系'
    }
  }

  // 验证参数
  if (!Array.isArray(bindingIds) || bindingIds.length === 0) {
    return {
      success: false,
      error: '绑定ID列表不能为空'
    }
  }

  if (bindingIds.length > 50) {
    return {
      success: false,
      error: '单次最多只能删除50个绑定关系'
    }
  }

  const results = []
  const errors = []

  for (const bindingId of bindingIds) {
    try {
      const result = await deleteBinding({ bindingId }, currentUser, isAdmin)

      if (result.success) {
        results.push({ bindingId, status: 'deleted' })
      } else {
        errors.push({
          bindingId,
          error: result.error
        })
      }
    } catch (err) {
      errors.push({
        bindingId,
        error: err.message
      })
    }
  }

  return {
    success: true,
    data: {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    }
  }
}

// 验证绑定关系的一致性
async function validateBindings(event, currentUser, isAdmin) {
  // 验证权限
  if (!isAdmin) {
    return {
      success: false,
      error: '只有管理员可以验证绑定关系'
    }
  }

  const issues = []

  // 1. 检查绑定关系中用户是否还存在且角色正确
  const allBindings = await db.collection('bindings')
    .where({ status: 'active' })
    .get()

  const allUsers = await db.collection('users').get()
  const userMap = allUsers.data.reduce((map, user) => {
    map[user._openid] = user
    return map
  }, {})

  for (const binding of allBindings.data) {
    // 检查老板是否存在且是Boss角色
    if (!userMap[binding.bossId]) {
      issues.push({
        type: 'missing_boss',
        bindingId: binding._id,
        bossId: binding.bossId,
        message: '老板用户不存在'
      })
    } else if (userMap[binding.bossId].role !== 'Boss') {
      issues.push({
        type: 'invalid_boss_role',
        bindingId: binding._id,
        bossId: binding.bossId,
        currentRole: userMap[binding.bossId].role,
        message: '老板用户角色不正确'
      })
    }

    // 检查员工是否存在且是Staff角色
    if (!userMap[binding.staffId]) {
      issues.push({
        type: 'missing_staff',
        bindingId: binding._id,
        staffId: binding.staffId,
        message: '员工用户不存在'
      })
    } else if (userMap[binding.staffId].role !== 'Staff') {
      issues.push({
        type: 'invalid_staff_role',
        bindingId: binding._id,
        staffId: binding.staffId,
        currentRole: userMap[binding.staffId].role,
        message: '员工用户角色不正确'
      })
    }
  }

  // 2. 检查是否有重复的绑定关系
  const bindingMap = {}
  for (const binding of allBindings.data) {
    const key = `${binding.bossId}-${binding.staffId}`
    if (bindingMap[key]) {
      issues.push({
        type: 'duplicate_binding',
        bindingIds: [binding._id, bindingMap[key]],
        bossId: binding.bossId,
        staffId: binding.staffId,
        message: '存在重复的绑定关系'
      })
    } else {
      bindingMap[key] = binding._id
    }
  }

  return {
    success: true,
    data: {
      totalBindings: allBindings.data.length,
      issuesCount: issues.length,
      issues
    }
  }
}
