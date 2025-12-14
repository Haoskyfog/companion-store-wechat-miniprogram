// 审核报备云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证管理员权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有管理员可以审核'
      }
    }

    // 更新报备状态
    await db.collection('reports').doc(event.reportId).update({
      data: {
        status: event.status, // 'approved' 或 'rejected'
        auditTime: db.serverDate(),
        auditorId: openid,
        auditRemark: event.remark || '',
        updateTime: db.serverDate()
      }
    })

    return {
      success: true
    }
  } catch (err) {
    console.error('审核失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
