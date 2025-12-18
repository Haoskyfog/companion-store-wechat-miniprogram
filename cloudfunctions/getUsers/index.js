// 获取用户列表云函数（管理员用）
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
    const isBoss = currentUser.role === 'Boss'
    const isStaff = currentUser.role === 'Staff'

    // 权限检查：管理员可以查看所有，Boss可以查看Staff，Staff只能查看其他Staff
    let canAccess = false

    if (isAdmin) {
      canAccess = true // 管理员可以查看所有
    } else if (isBoss && event.role === 'Staff') {
      canAccess = true // Boss可以查看员工列表
    } else if (isStaff && event.role === 'Staff') {
      canAccess = true // Staff可以查看其他员工
    } else if (event.staffId) {
      // 如果是查询特定员工，允许相关权限的用户访问
      canAccess = isAdmin || isBoss || isStaff
    } else if (!event.role && isAdmin) {
      // 如果没有指定role参数，但用户是管理员，也允许访问（用于绑定页面等场景）
      canAccess = true
    }

    if (!canAccess) {
      return {
        success: false,
        error: '权限不足'
      }
    }

    // 分页参数
    const page = event.page || 1
    const pageSize = Math.min(event.pageSize || 20, 50) // 限制最大pageSize为50
    const skip = (page - 1) * pageSize

    let query = db.collection('users')

    // 按员工ID查询（通过_openid）
    if (event.staffId) {
      query = query.where({
        _openid: event.staffId
      })
    } else {
      // 只有在非特定员工查询时才应用角色过滤
      if (event.role) {
        query = query.where({ role: event.role })
      }

      // 搜索过滤 - 只在有关键词时才应用，以提高性能
      if (event.keyword && event.keyword.trim()) {
        const keyword = event.keyword.trim()
        query = query.where({
          nickname: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
      }
    }

    // 排序
    query = query.orderBy('createTime', 'desc')

    // 设置超时保护
    const result = await Promise.race([
      query.skip(skip).limit(pageSize).get(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 2500)
      )
    ])

    return {
      success: true,
      data: {
        users: result.data,
        total: result.data.length,
        page,
        pageSize
      }
    }
  } catch (err) {
    console.error('获取用户列表失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}