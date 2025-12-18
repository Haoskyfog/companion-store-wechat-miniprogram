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

// 计算老板的直属流水（所有直属员工完成的订单金额总和）
async function calculateSubordinateRevenue(bossId) {
  try {
    // 1. 找到该老板的所有直属员工
    const bindingsResult = await db.collection('bindings').where({
      bossId: bossId,
      status: 'active'
    }).get()

    if (bindingsResult.data.length === 0) {
      return 0
    }

    const staffIds = bindingsResult.data.map(binding => binding.staffId)

    // 2. 计算这些员工完成的所有订单金额
    const ordersResult = await db.collection('orders').where({
      staffId: _.in(staffIds),
      status: 'completed',
      paymentStatus: 'paid'
    }).get()

    // 3. 累加订单金额
    let totalRevenue = 0
    for (const order of ordersResult.data) {
      const amount = parseFloat(order.amount) || 0
      totalRevenue += amount
    }

    return totalRevenue
  } catch (error) {
    console.error('计算直属流水失败:', error)
    return 0
  }
}

// 计算员工的直属流水（该员工作为服务员工完成的已支付订单金额总和）
async function calculateStaffSubordinateRevenue(staffId) {
  try {
    // 查询该员工作为服务员工完成的所有已支付订单
    const ordersResult = await db.collection('orders').where({
      staffId: staffId,
      status: 'completed',
      paymentStatus: 'paid'
    }).get()

    // 累加订单金额
    let totalRevenue = 0
    for (const order of ordersResult.data) {
      const amount = parseFloat(order.amount) || 0
      totalRevenue += amount
    }

    console.log(`员工 ${staffId} 直属流水: ${totalRevenue}`)
    return totalRevenue
  } catch (error) {
    console.error('计算员工直属流水失败:', error)
    return 0
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

  // 直属流水
  const subordinateRevenue = await calculateSubordinateRevenue(bossId)

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
      },
      subordinateRevenue: subordinateRevenue
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

  // 计算个人流水（通过报备的总金额）
  const approvedReportsList = reportStats.data.filter(r => r.status === 'approved')
  
  let totalRevenue = 0
  approvedReportsList.forEach((report) => {
    let amount = 0
    if (report.amount !== undefined && report.amount !== null) {
      if (typeof report.amount === 'number') {
        amount = report.amount
      } else if (typeof report.amount === 'string') {
        amount = parseFloat(report.amount) || 0
      } else {
        amount = Number(report.amount) || 0
      }
    }
    totalRevenue += amount
  })

  // 计算员工的直属流水
  const staffSubordinateRevenue = await calculateStaffSubordinateRevenue(staffId)

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
        approved: approvedReports,
        totalRevenue: totalRevenue
      },
      subordinateRevenue: staffSubordinateRevenue
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

  // 计算总流水（从所有通过的报备中获取金额总和）
  const approvedReports = await db.collection('reports').where({
    status: 'approved'
  }).get()

  // 计算时间范围
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  let totalRevenue = 0
  let dayTotal = 0
  let monthTotal = 0

  approvedReports.data.forEach((report) => {
    let amount = 0
    if (report.amount !== undefined && report.amount !== null) {
      if (typeof report.amount === 'number') {
        amount = report.amount
      } else if (typeof report.amount === 'string') {
        amount = parseFloat(report.amount) || 0
      } else {
        amount = Number(report.amount) || 0
      }
    }
    totalRevenue += amount

    // 按时间统计
    const reportTime = report.approveTime || report.createTime
    if (reportTime) {
      const reportDate = new Date(reportTime)
      if (reportDate >= todayStart && reportDate <= todayEnd) {
        dayTotal += amount
      }
      if (reportDate >= monthStart && reportDate <= monthEnd) {
        monthTotal += amount
      }
    }
  })

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
        total: totalRevenue,
        dayTotal: dayTotal,
        monthTotal: monthTotal
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