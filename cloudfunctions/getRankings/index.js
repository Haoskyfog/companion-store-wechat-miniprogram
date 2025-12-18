// 获取排行榜云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const type = event.type || 'staff' // 'staff' 或 'subordinate'
    const period = event.period || 'total' // month, quarter, year, total
    const periodValue = event.periodValue || (period === 'total' ? 'all' : getCurrentPeriod(period))

    // 不再需要测试模式，直接查询真实数据

    let rankings
    if (type === 'subordinate') {
      // 直属排行榜（老板按直属流水排名）
      rankings = await calculateSubordinateRankings(period, periodValue)
    } else {
      // 员工排行榜（默认）
      rankings = await calculateRankingsSimple(period, periodValue)
    }

    // 获取所有员工用户信息（一次性查询，避免多次查询）
    const allStaffUsers = await db.collection('users')
      .where({
        role: 'Staff'
      })
      .get()

    // 创建员工信息的映射表
    const staffInfoMap = {}
    allStaffUsers.data.forEach(user => {
      staffInfoMap[user._openid] = {
        nickname: user.nickname || '未知用户',
        userId: user.userId || user._openid.substring(0, 8),
        avatar: user.avatar
          }
    })

    // 过滤只保留有效员工的排行榜数据
    const validRankings = rankings.filter(ranking => {
      const exists = staffInfoMap[ranking.staffId]
      if (!exists) {
        console.log(`过滤掉不存在的员工: ${ranking.staffId}`)
      }
      return exists
    })

    // 为有效排行榜添加用户信息
    rankings = validRankings.map((ranking, index) => ({
      ...ranking,
      rank: index + 1,
      userInfo: staffInfoMap[ranking.staffId]
    }))
    console.log(`排行榜计算完成: ${rankings.length}个员工用户`)

    // 移除头像URL转换，由前端处理以提升性能

    return {
      success: true,
      data: {
        rankings,
        type,
        period,
        periodValue
      }
    }
  } catch (err) {
    console.error('获取排行榜失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 简化版计算排行榜数据（不保存到数据库）
async function calculateRankingsSimple(period, periodValue) {
  const db = cloud.database()
  const _ = db.command

  // 获取所有员工用户
  const staffUsers = await db.collection('users')
    .where({
      role: 'Staff'
    })
    .get()

  if (staffUsers.data.length === 0) {
    console.log('没有找到员工用户，返回空排行榜')
    return {
      success: true,
      data: {
        rankings: [],
        period,
        periodValue
      }
    }
  }

  const staffIds = staffUsers.data.map(user => user._openid)

  // 获取所有通过的报备，按报备通过数统计
  let approvedReports
  if (period === 'total') {
    // 总排行不限制时间
    approvedReports = await db.collection('reports')
    .where({
      staffId: _.in(staffIds),
        status: 'approved'
    })
    .get()
  } else {
    // 根据周期确定时间范围
    const dateRange = getDateRange(period, periodValue)
    approvedReports = await db.collection('reports')
    .where({
        staffId: _.in(staffIds),
        status: 'approved',
        createTime: _.gte(dateRange.start).and(_.lte(dateRange.end))
    })
    .get()
  }

  // 初始化所有员工的统计数据（个人流水为0）
  const staffStats = {}
  for (const staffId of staffIds) {
      staffStats[staffId] = {
        staffId,
        orderCount: 0, // 保持兼容，但现在主要按totalRevenue排序
        totalRevenue: 0, // 个人流水（通过报备的总金额）
        totalDuration: 0
      }
    }

  // 按员工统计报备通过的金额总和
  console.log('=== 排行榜金额计算调试 ===')
  console.log('通过报备总数:', approvedReports.data.length)
  
  for (const report of approvedReports.data) {
    const staffId = report.staffId
    // 只有在员工列表中的才统计（额外安全检查）
    if (staffStats[staffId]) {
      staffStats[staffId].orderCount++ // 报备通过数（保持兼容）
      
      // 确保金额是数字类型并累加
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
      
      staffStats[staffId].totalRevenue += amount // 累计个人流水
      
      console.log(`员工 ${staffId} 报备金额: ${amount}, 累计流水: ${staffStats[staffId].totalRevenue}`)
      // 可以选择是否统计时长，这里先保持为0或者从订单中获取
    }
  }
  
  console.log('=== 排行榜金额计算完成 ===')

  // 转换为数组并按个人流水排序
  const rankings = Object.values(staffStats)
    .map((item) => {
      // 确保 totalRevenue 是数字类型
      const totalRevenue = typeof item.totalRevenue === 'number' ? item.totalRevenue : (Number(item.totalRevenue) || 0)
      return {
        ...item,
        totalRevenue: totalRevenue // 确保是数字类型
      }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue) // 按个人流水排序
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      rating: 95 + Math.random() * 5, // 模拟好评率
      totalRevenue: Number(item.totalRevenue) || 0 // 再次确保是数字类型
    }))
  
  // 调试：输出排行榜数据
  console.log('=== 排行榜数据调试 ===')
  rankings.forEach((ranking, index) => {
    console.log(`排名${index + 1}:`, {
      员工ID: ranking.staffId,
      个人流水: ranking.totalRevenue,
      流水类型: typeof ranking.totalRevenue,
      报备通过数: ranking.orderCount
    })
  })
  console.log('=== 调试结束 ===')

  // 简化版：直接返回计算结果，不保存到数据库
  return rankings
}

// 获取时间范围
function getDateRange(period, periodValue) {
  const now = new Date()
  let start, end

  switch (period) {
    case 'day':
      // 今日
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'month':
      // 本月
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    case 'quarter':
      // 简化为按季度计算
      const quarter = Math.floor(now.getMonth() / 3)
      const quarterStartMonth = quarter * 3
      start = new Date(now.getFullYear(), quarterStartMonth, 1)
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      break
    default:
      // total - 不限制时间
      start = new Date(2020, 0, 1)
      end = new Date(2099, 11, 31, 23, 59, 59)
  }

  return { start, end }
}

// 获取当前周期值
function getCurrentPeriod(period) {
  const now = new Date()
  switch (period) {
    case 'month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3) + 1
      return `${now.getFullYear()}-Q${quarter}`
    case 'year':
      return `${now.getFullYear()}`
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
}

// 计算直属排行榜（员工按直属流水排名）
async function calculateSubordinateRankings(period, periodValue) {
  const db = cloud.database()
  const _ = db.command

  // 获取所有员工用户
  const staffUsers = await db.collection('users')
    .where({
      role: 'Staff'
    })
    .get()

  if (staffUsers.data.length === 0) {
    console.log('没有找到员工用户，返回空排行榜')
    return []
  }

  const staffIds = staffUsers.data.map(user => user._openid)

  // 初始化所有员工的统计数据
  const staffStats = {}
  for (const staffId of staffIds) {
    staffStats[staffId] = {
      staffId,
      subordinateRevenue: 0 // 直属流水
    }
  }

  // 为每个员工计算直属流水（该员工作为服务员工完成的已支付订单金额总和）
  let ordersQuery = {
    staffId: _.in(staffIds),
    status: 'completed',
    paymentStatus: 'paid'
  }

  // 根据周期过滤（如果不是总排行）
  if (period !== 'total') {
    const dateRange = getDateRange(period, periodValue)
    ordersQuery.paymentTime = _.gte(dateRange.start).and(_.lte(dateRange.end))
  }

  const ordersResult = await db.collection('orders').where(ordersQuery).get()

  // 按员工统计订单金额
  for (const order of ordersResult.data) {
    const staffId = order.staffId
    if (staffStats[staffId]) {
      const amount = parseFloat(order.amount) || 0
      staffStats[staffId].subordinateRevenue += amount
    }
  }

  // 转换为数组并按直属流水排序
  const rankings = Object.values(staffStats)
    .sort((a, b) => b.subordinateRevenue - a.subordinateRevenue)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))

  console.log(`直属排行榜计算完成: ${rankings.length}个员工用户`)

  return rankings
}

// 添加测试员工数据
async function addTestStaffData() {
  const db = cloud.database()

  const testStaff = [
    {
      _openid: 'test_staff_001',
      role: 'Staff',
      nickname: '小明',
      userId: '20001',
      avatar: null
    },
    {
      _openid: 'test_staff_002',
      role: 'Staff',
      nickname: '小红',
      userId: '20002',
      avatar: null
    },
    {
      _openid: 'test_staff_003',
      role: 'Staff',
      nickname: '小刚',
      userId: '20003',
      avatar: null
    }
  ]

  for (const staff of testStaff) {
    try {
      // 检查是否已存在
      const existing = await db.collection('users').where({
        _openid: staff._openid
      }).get()

      if (existing.data.length === 0) {
        await db.collection('users').add({
          data: {
            ...staff,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        console.log(`测试员工 ${staff.nickname} 创建成功`)
      }
    } catch (error) {
      console.log(`测试员工 ${staff.nickname} 创建失败:`, error)
    }
  }
}