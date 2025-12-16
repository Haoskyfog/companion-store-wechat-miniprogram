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
  
  // 调试：输出所有报备的金额信息
  console.log('=== 员工所有报备金额调试 ===')
  reportStats.data.forEach((report, index) => {
    console.log(`报备${index + 1}:`, {
      报备ID: report._id,
      状态: report.status,
      金额: report.amount,
      金额类型: typeof report.amount
    })
  })
  console.log('=== 调试结束 ===')

  // 计算个人流水（通过报备的总金额）
  const approvedReportsList = reportStats.data.filter(r => r.status === 'approved')
  
  console.log('=== 员工个人流水计算调试 ===')
  console.log('员工ID:', staffId)
  console.log('总报备数:', reportStats.data.length)
  console.log('已通过报备数:', approvedReportsList.length)
  
  let totalRevenue = 0
  approvedReportsList.forEach((report, index) => {
    // 确保金额是数字类型
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
    
    console.log(`已通过报备${index + 1}:`, {
      报备ID: report._id,
      金额原始值: report.amount,
      金额类型: typeof report.amount,
      转换后金额: amount,
      累计流水: totalRevenue,
      状态: report.status,
      完整报备对象: JSON.stringify(report, null, 2)
    })
  })
  
  console.log('最终个人流水:', totalRevenue)
  console.log('=== 调试结束 ===')

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

  // 计算总流水（从所有通过的报备中获取金额总和）
  const approvedReports = await db.collection('reports').where({
    status: 'approved'
  }).get()
  
  // 额外验证：直接查询数据库，确保金额字段存在
  console.log('=== 数据库查询验证 ===')
  const sampleReport = approvedReports.data.length > 0 ? approvedReports.data[0] : null
  if (sampleReport) {
    console.log('示例报备记录:', {
      报备ID: sampleReport._id,
      所有字段: Object.keys(sampleReport),
      金额字段存在: 'amount' in sampleReport,
      金额值: sampleReport.amount,
      金额类型: typeof sampleReport.amount
    })
  }

  // 调试日志：输出所有通过报备的详细信息
  console.log('=== 总流水计算调试 ===')
  console.log('通过报备数量:', approvedReports.data.length)
  
  if (approvedReports.data.length === 0) {
    console.log('⚠️ 没有已通过的报备，总流水为0')
  }

  let totalRevenue = 0
  approvedReports.data.forEach((report, index) => {
    // 确保金额是数字类型
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
    console.log(`报备${index + 1}:`, {
      报备ID: report._id,
      员工ID: report.staffId,
      金额原始值: report.amount,
      金额类型: typeof report.amount,
      转换后金额: amount,
      状态: report.status,
      当前累计: totalRevenue
    })
    
    // 如果金额为0或无效，输出警告和完整对象
    if (!amount || amount === 0) {
      console.warn(`⚠️ 报备${index + 1}的金额为0或无效:`, report.amount)
      console.warn('完整报备对象:', JSON.stringify(report, null, 2))
    }
  })

  console.log('最终总流水:', totalRevenue)
  console.log('=== 调试结束 ===')

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