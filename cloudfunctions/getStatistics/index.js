// 获取统计数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const userRole = userResult.data[0].role

    if (userRole === 'Boss') {
      return await getBossStatistics(openid)
    } else if (userRole === 'Staff') {
      return await getStaffStatistics(openid)
    } else if (['Admin', 'SuperAdmin'].includes(userRole)) {
      return await getAdminStatistics()
    } else {
      return {
        success: false,
        error: '无权限查看统计数据'
      }
    }
  } catch (err) {
    console.error('获取统计数据失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 老板统计数据
async function getBossStatistics(bossId) {
  // 订单统计
  const orderStats = await db.collection('orders')
    .where({ bossId })
    .get()

  const totalOrders = orderStats.data.length
  const pendingOrders = orderStats.data.filter(o => o.status === 'pending').length
  const confirmedOrders = orderStats.data.filter(o => o.status === 'confirmed').length
  const completedOrders = orderStats.data.filter(o => o.status === 'completed').length

  // 直属员工统计
  const staffCount = await db.collection('bindings')
    .where({
      bossId,
      status: 'active'
    })
    .count()

  return {
    success: true,
    data: {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        completed: completedOrders
      },
      staff: {
        total: staffCount.total
      }
    }
  }
}

// 员工统计数据
async function getStaffStatistics(staffId) {
  // 订单统计
  const orderStats = await db.collection('orders')
    .where({ staffId })
    .get()

  const totalOrders = orderStats.data.length
  const pendingOrders = orderStats.data.filter(o => o.status === 'pending').length
  const confirmedOrders = orderStats.data.filter(o => o.status === 'confirmed').length
  const completedOrders = orderStats.data.filter(o => o.status === 'completed').length
  const totalDuration = orderStats.data.reduce((sum, order) => sum + (order.duration || 0), 0)

  // 报备统计
  const reportStats = await db.collection('reports')
    .where({ staffId })
    .get()

  const totalReports = reportStats.data.length
  const pendingReports = reportStats.data.filter(r => r.status === 'pending').length
  const approvedReports = reportStats.data.filter(r => r.status === 'approved').length

  return {
    success: true,
    data: {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        completed: completedOrders,
        totalDuration
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        approved: approvedReports
      }
    }
  }
}

// 管理员统计数据
async function getAdminStatistics() {
  // 用户统计
  const bossCount = await db.collection('users').where({ role: 'Boss' }).count()
  const staffCount = await db.collection('users').where({ role: 'Staff' }).count()
  const adminCount = await db.collection('users').where({ role: { $in: ['Admin', 'SuperAdmin'] } }).count()

  // 订单统计
  const orderStats = await db.collection('orders').get()
  const totalOrders = orderStats.data.length
  const pendingOrders = orderStats.data.filter(o => o.status === 'pending').length
  const completedOrders = orderStats.data.filter(o => o.status === 'completed').length

  // 计算总流水（假设每个订单固定价格，这里用订单数量 * 固定价格作为示例）
  // 实际项目中应该从订单记录中获取真实金额
  const totalRevenue = totalOrders * 50 // 示例：每个订单50元

  // 报备统计
  const reportStats = await db.collection('reports').get()
  const totalReports = reportStats.data.length
  const pendingReports = reportStats.data.filter(r => r.status === 'pending').length

  // 绑定统计
  const bindingCount = await db.collection('bindings').where({ status: 'active' }).count()

  // 更换申请统计
  const changeRequests = await db.collection('roleChangeRequests').where({ status: 'pending' }).count()

  return {
    success: true,
    data: {
      users: {
        boss: bossCount.total,
        staff: staffCount.total,
        admin: adminCount.total,
        total: bossCount.total + staffCount.total + adminCount.total
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders
      },
      revenue: {
        total: totalRevenue
      },
      reports: {
        total: totalReports,
        pending: pendingReports
      },
      bindings: {
        active: bindingCount.total
      },
      requests: {
        pending: changeRequests.total
      }
    }
  }
}