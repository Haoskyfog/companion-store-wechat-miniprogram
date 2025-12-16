// 批量创建测试员工云函数
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

    // 只有管理员和超级管理员可以创建测试员工
    if (!isAdmin && !isSuperAdmin) {
      return {
        success: false,
        error: '权限不足，只有管理员可以创建测试员工'
      }
    }

    const { count = 50 } = event

    // 验证参数
    if (count < 1 || count > 200) {
      return {
        success: false,
        error: '员工数量必须在1-200之间'
      }
    }

    // 生成测试员工
    const testStaff = generateTestStaff(count)

    // 批量插入员工
    const batchSize = 50 // 每次最多插入50条记录
    const results = []

    for (let i = 0; i < testStaff.length; i += batchSize) {
      const batch = testStaff.slice(i, i + batchSize)
      try {
        const result = await db.collection('users').add({
          data: batch
        })
        results.push({
          success: true,
          batchIndex: Math.floor(i / batchSize) + 1,
          insertedCount: batch.length,
          result
        })
      } catch (batchError) {
        console.error(`批量插入失败 (批次 ${Math.floor(i / batchSize) + 1}):`, batchError)
        results.push({
          success: false,
          batchIndex: Math.floor(i / batchSize) + 1,
          error: batchError.message
        })
      }
    }

    // 统计结果
    const successCount = results.filter(r => r.success).reduce((sum, r) => sum + r.insertedCount, 0)
    const failedCount = count - successCount

    return {
      success: true,
      data: {
        requestedCount: count,
        successCount,
        failedCount,
        results,
        message: `成功创建 ${successCount} 个员工用户`
      }
    }

  } catch (err) {
    console.error('批量创建测试员工失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 生成测试员工数据
function generateTestStaff(count) {
  const staffList = []

  // 员工昵称池
  const firstNames = ['小明', '小红', '小刚', '小李', '小王', '小张', '小赵', '小刘', '小陈', '小杨',
                     '小黄', '小周', '小吴', '小郑', '小孙', '小徐', '小朱', '小何', '小郭', '小林']

  // 地区池
  const regions = ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '武汉', '成都', '重庆']

  for (let i = 1; i <= count; i++) {
    const userId = `staff${String(i).padStart(4, '0')}`

    // 生成随机昵称
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const suffix = Math.floor(Math.random() * 9) + 1
    const nickname = firstName + suffix

    // 生成随机创建时间（最近30天内）
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
    const createTime = new Date(randomTime)

    // 生成随机统计数据
    const totalOrders = Math.floor(Math.random() * 100) + 10 // 10-110单
    const totalDuration = Math.floor(Math.random() * 500) + 50 // 50-550小时

    const staffData = {
      _openid: `staff_openid_${userId}`, // 模拟openid
      role: 'Staff',
      nickname: nickname,
      userId: userId,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=staff${i}`,
      walletBalance: 0,
      createTime: createTime,
      updateTime: createTime,
      // 员工统计数据
      totalOrders: totalOrders,
      totalDuration: totalDuration,
      // 额外字段
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      region: regions[Math.floor(Math.random() * regions.length)],
      level: Math.floor(Math.random() * 10) + 1, // 1-10级
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0评分
      status: 'active' // 状态
    }

    staffList.push(staffData)
  }

  return staffList
}
