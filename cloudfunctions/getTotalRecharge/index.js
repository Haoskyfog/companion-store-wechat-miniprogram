// 获取用户累计消费金额云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

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

    // 从报备表中查询该老板相关的通过报备金额总和
    let totalConsumption = 0

    try {
      // 查询该老板相关的通过报备
      const reportResult = await db.collection('reports').where({
        bossId: openid,
        status: 'approved' // 只计算通过的报备
      }).get()

      totalConsumption = reportResult.data.reduce((sum, report) => sum + (parseFloat(report.amount) || 0), 0)
    } catch (err) {
      // 如果查询失败，返回0
      console.log('报备查询失败，使用默认值0:', err.message)
      totalConsumption = 0
    }

    return {
      success: true,
      data: {
        totalConsumption
      }
    }
  } catch (err) {
    console.error('获取累计消费金额失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
