// 获取排行榜云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const period = event.period || 'total' // month, quarter, year, total
    const periodValue = event.periodValue || (period === 'total' ? 'all' : getCurrentPeriod(period))

    // 不再需要测试模式，直接查询真实数据

    // 强制重新计算排行榜，不使用缓存数据（确保只包含当前员工角色的用户）
    let rankings = await calculateRankings(period, periodValue)

    // 获取用户信息，并过滤掉非员工角色的用户
    const originalCount = rankings.length
    const validRankings = []
    for (const ranking of rankings) {
      const userResult = await db.collection('users').where({
        _openid: ranking.staffId
      }).get()
      if (userResult.data && userResult.data.length > 0) {
        const userData = userResult.data[0]
        // 只保留role为'Staff'的用户
        if (userData.role === 'Staff') {
        ranking.userInfo = {
            nickname: userData.nickname || '未知用户',
            userId: userData.userId || ranking.staffId.substring(0, 8),
            avatar: userData.avatar
          }
          validRankings.push(ranking)
        } else {
          // 记录被过滤掉的非员工用户
          console.log(`过滤掉非员工用户: ${userData.nickname || ranking.staffId}, 角色: ${userData.role}`)
        }
      } else {
        // 用户不存在，也过滤掉
        console.log(`过滤掉不存在的用户: ${ranking.staffId}`)
      }
    }
    // 更新rankings为有效的排行榜数据，并重新计算排名
    rankings = validRankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }))
    console.log(`排行榜过滤完成: 原始${originalCount}个, 有效${rankings.length}个员工用户`)

    // 收集所有 cloud:// 格式的头像文件ID（去重）
    const cloudFileIds = []
    const cloudFileIdsSet = new Set()
    rankings.forEach(ranking => {
      if (ranking.userInfo && ranking.userInfo.avatar && ranking.userInfo.avatar.startsWith('cloud://')) {
        cloudFileIdsSet.add(ranking.userInfo.avatar)
      }
    })
    cloudFileIds.push(...Array.from(cloudFileIdsSet))

    // 批量转换 cloud:// 为 https://
    if (cloudFileIds.length > 0) {
      const tempFileURLs = await cloud.getTempFileURL({
        fileList: cloudFileIds
      })

      // 创建 fileID 到 tempFileURL 的映射
      const fileIdToUrlMap = {}
      if (tempFileURLs && tempFileURLs.fileList) {
        tempFileURLs.fileList.forEach(item => {
          if (item.status === 0 && item.tempFileURL) {
            fileIdToUrlMap[item.fileID] = item.tempFileURL
          }
        })
      }

      // 更新排行榜中的头像URL
      rankings.forEach(ranking => {
        if (ranking.userInfo && ranking.userInfo.avatar && ranking.userInfo.avatar.startsWith('cloud://')) {
          const newUrl = fileIdToUrlMap[ranking.userInfo.avatar]
          if (newUrl) {
            ranking.userInfo.avatar = newUrl
        }
      }
      })
    }

    return {
      success: true,
      data: {
        rankings,
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

// 计算排行榜数据
async function calculateRankings(period, periodValue) {
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

  // 初始化所有员工的统计数据（报备通过数为0）
  const staffStats = {}
  for (const staffId of staffIds) {
      staffStats[staffId] = {
        staffId,
      orderCount: 0, // 这里其实是报备通过数
        totalDuration: 0
      }
    }

  // 按员工统计报备通过数量
  for (const report of approvedReports.data) {
    const staffId = report.staffId
    // 只有在员工列表中的才统计（额外安全检查）
    if (staffStats[staffId]) {
      staffStats[staffId].orderCount++ // 报备通过数
      // 可以选择是否统计时长，这里先保持为0或者从订单中获取
    }
  }

  // 转换为数组并按报备通过数量排序
  const rankings = Object.values(staffStats)
    .sort((a, b) => b.orderCount - a.orderCount) // 按报备通过数量排序
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      rating: 95 + Math.random() * 5 // 模拟好评率
    }))

  // 先删除旧的排行榜数据
  await db.collection('rankings').where({
    period: period,
    periodValue: periodValue
  }).remove()

  // 保存新的排行榜数据
  for (const ranking of rankings) {
    await db.collection('rankings').add({
      data: {
        ...ranking,
        period,
        periodValue,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
  }

  return rankings
}

// 获取时间范围
function getDateRange(period, periodValue) {
  const now = new Date()
  let start, end

  switch (period) {
    case 'month':
      const [year, month] = periodValue.split('-').map(Number)
      start = new Date(year, month - 1, 1)
      end = new Date(year, month, 0, 23, 59, 59)
      break
    case 'quarter':
      // 简化为按季度计算
      const quarter = parseInt(periodValue.split('-')[1])
      const quarterStartMonth = (quarter - 1) * 3
      start = new Date(now.getFullYear(), quarterStartMonth, 1)
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59)
      break
    case 'year':
      start = new Date(parseInt(periodValue), 0, 1)
      end = new Date(parseInt(periodValue), 11, 31, 23, 59, 59)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
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