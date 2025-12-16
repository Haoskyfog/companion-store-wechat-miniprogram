// 用户管理云函数
// 支持：查询用户列表、修改用户角色
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
    const isAdmin = currentUser.role === 'Admin'
    const isSuperAdmin = currentUser.role === 'SuperAdmin'

    // 只有管理员和超级管理员可以管理用户
    if (!isAdmin && !isSuperAdmin) {
      return {
        success: false,
        error: '权限不足，只有管理员可以管理用户'
      }
    }

    const { action } = event

    switch (action) {
      case 'query':
        return await queryUsers(event, currentUser, isAdmin, isSuperAdmin)
      case 'updateRole':
        return await updateUserRole(event, currentUser, isAdmin, isSuperAdmin)
      case 'cleanup':
        // 只有超级管理员可以执行清理操作
        if (!isSuperAdmin) {
          return {
            success: false,
            error: '只有超级管理员可以执行清理操作'
          }
        }
        const cleanupResult = await cleanupInvalidUsers()
        return {
          success: true,
          data: cleanupResult
        }
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (err) {
    console.error('用户管理失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 清理无效用户数据（可选的管理功能）
async function cleanupInvalidUsers() {
  try {
    // 查找所有用户记录
    const allUsers = await db.collection('users').get()

    const invalidUsers = []
    const validUsers = []

    for (const user of allUsers.data) {
      if (!user._id || !user._openid || !user.role) {
        invalidUsers.push(user)
      } else {
        validUsers.push(user)
      }
    }

    console.log(`找到 ${validUsers.length} 个有效用户，${invalidUsers.length} 个无效用户`)

    // 删除无效用户记录
    for (const invalidUser of invalidUsers) {
      if (invalidUser._id) {
        await db.collection('users').doc(invalidUser._id).remove()
        console.log(`删除无效用户: ${invalidUser._id}`)
      }
    }

    return {
      validCount: validUsers.length,
      invalidCount: invalidUsers.length,
      cleaned: invalidUsers.length
    }
  } catch (err) {
    console.error('清理无效用户失败:', err)
    throw err
  }
}

// 查询用户列表
async function queryUsers(event, currentUser, isAdmin, isSuperAdmin) {
  const { page = 1, pageSize = 20, role, keyword } = event
  const skip = (page - 1) * pageSize

  let query = db.collection('users')

  // 角色过滤
  if (role) {
    query = query.where({ role })
  }

  // 搜索过滤
  if (keyword) {
    query = query.where({
      nickname: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
  }

  // 排序
  query = query.orderBy('createTime', 'desc')

  const result = await query.skip(skip).limit(pageSize).get()

  // 处理用户数据，过滤掉无效用户并直接返回原始头像URL
  const totalBeforeFilter = result.data.length
  const users = result.data
    .filter(user => {
      // 确保用户有基本必要字段，且不为空字符串，并且role是有效的
      const isValid = user &&
             user._id &&
             typeof user._id === 'string' &&
             user._id.trim().length > 0 &&
             user._openid &&
             typeof user._openid === 'string' &&
             user._openid.trim().length > 0 &&
             user.role &&
             typeof user.role === 'string' &&
             user.role.trim().length > 0 &&
             ['Boss', 'Staff', 'Admin', 'SuperAdmin'].includes(user.role.trim())

      if (!isValid) {
        console.log('Filtered out invalid user:', {
          _id: user._id,
          _openid: user._openid,
          role: user.role,
          nickname: user.nickname
        })
      }

      return isValid
    })
    .map(user => ({
      ...user,
      // 直接使用原始头像URL，不进行转换
      avatar: user.avatar || ''
    }))

  console.log(`Filtered users: ${totalBeforeFilter} -> ${users.length} (removed ${totalBeforeFilter - users.length})`)

  // 获取总数（重新查询以确保准确性）
  let countQuery = db.collection('users')
  if (role) {
    countQuery = countQuery.where({ role })
  }
  if (keyword) {
    countQuery = countQuery.where({
      nickname: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
  }

  // 获取所有匹配的记录，然后在内存中过滤
  const allMatchingUsers = await countQuery.get()
  const validUsersCount = allMatchingUsers.data.filter(user =>
    user &&
    user._id &&
    typeof user._id === 'string' &&
    user._id.trim().length > 0 &&
    user._openid &&
    typeof user._openid === 'string' &&
    user._openid.trim().length > 0 &&
    user.role &&
    typeof user.role === 'string' &&
    user.role.trim().length > 0 &&
    ['Boss', 'Staff', 'Admin', 'SuperAdmin'].includes(user.role.trim())
  ).length

  return {
    success: true,
    data: {
      users,
      total: validUsersCount,
      page,
      pageSize
    }
  }
}

// 更新用户角色
async function updateUserRole(event, currentUser, isAdmin, isSuperAdmin) {
  const { userId, newRole } = event

  // 验证参数
  if (!userId || !newRole) {
    return {
      success: false,
      error: '用户ID和新角色不能为空'
    }
  }

  // 获取目标用户信息
  const targetUserResult = await db.collection('users').doc(userId).get()

  if (!targetUserResult.data) {
    return {
      success: false,
      error: '目标用户不存在'
    }
  }

  const targetUser = targetUserResult.data
  const targetRole = targetUser.role

  // 权限验证逻辑
  let canUpdate = false

  if (isSuperAdmin) {
    // 超级管理员可以修改任何角色，除了同级
    if (targetRole !== 'SuperAdmin') {
      canUpdate = true
    } else {
      return {
        success: false,
        error: '不能修改同级超级管理员的角色'
      }
    }
  } else if (isAdmin) {
    // 普通管理员只能在Boss和Staff之间切换
    const allowedTransitions = [
      { from: 'Boss', to: 'Staff' },
      { from: 'Staff', to: 'Boss' }
    ]

    canUpdate = allowedTransitions.some(transition =>
      transition.from === targetRole && transition.to === newRole
    )

    if (!canUpdate) {
      return {
        success: false,
        error: '管理员只能在老板和员工角色之间切换'
      }
    }
  }

  if (!canUpdate) {
    return {
      success: false,
      error: '权限不足'
    }
  }

  // 检查是否是合理的角色转换
  const validRoles = ['Boss', 'Staff', 'Admin', 'SuperAdmin']
  if (!validRoles.includes(newRole)) {
    return {
      success: false,
      error: '无效的目标角色'
    }
  }

  // 防止用户修改自己的角色（安全考虑）
  if (userId === currentUser._id) {
    return {
      success: false,
      error: '不能修改自己的角色'
    }
  }

  // 更新用户角色
  await db.collection('users').doc(userId).update({
    data: {
      role: newRole,
      updateTime: db.serverDate()
    }
  })

  // 如果用户角色发生变化，需要清理相关的绑定关系
  if (targetRole !== newRole) {
    await cleanupBindingsAfterRoleChange(userId, targetRole, newRole)
  }

  return {
    success: true,
    message: '用户角色更新成功'
  }
}

// 角色变化后的绑定关系清理
async function cleanupBindingsAfterRoleChange(userId, oldRole, newRole) {
  const userResult = await db.collection('users').doc(userId).get()
  if (!userResult.data) return

  const userOpenid = userResult.data._openid

  // 如果从Boss变为非Boss，删除所有以他为Boss的绑定
  if (oldRole === 'Boss' && newRole !== 'Boss') {
    await db.collection('bindings').where({
      bossId: userOpenid,
      status: 'active'
    }).update({
      data: {
        status: 'inactive',
        updateTime: db.serverDate(),
        updateReason: '用户角色变更为' + newRole
      }
    })
  }

  // 如果从Staff变为非Staff，删除所有以他为Staff的绑定
  if (oldRole === 'Staff' && newRole !== 'Staff') {
    await db.collection('bindings').where({
      staffId: userOpenid,
      status: 'active'
    }).update({
      data: {
        status: 'inactive',
        updateTime: db.serverDate(),
        updateReason: '用户角色变更为' + newRole
      }
    })
  }

  // 如果从Staff变为Boss，删除原Staff绑定
  if (oldRole === 'Staff' && newRole === 'Boss') {
    await db.collection('bindings').where({
      staffId: userOpenid,
      status: 'active'
    }).update({
      data: {
        status: 'inactive',
        updateTime: db.serverDate(),
        updateReason: '用户角色变更为Boss'
      }
    })
  }

  // 如果从Boss变为Staff，删除原Boss绑定
  if (oldRole === 'Boss' && newRole === 'Staff') {
    await db.collection('bindings').where({
      bossId: userOpenid,
      status: 'active'
    }).update({
      data: {
        status: 'inactive',
        updateTime: db.serverDate(),
        updateReason: '用户角色变更为Staff'
      }
    })
  }
}
