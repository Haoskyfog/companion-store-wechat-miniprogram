// 提交报备云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户角色（必须是员工）
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Staff', 'Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有员工可以提交报备'
      }
    }

    // 创建报备记录
    const report = {
      _openid: openid,
      staffId: openid,
      bossId: event.bossId,
      date: event.date,
      game: event.game,
      duration: event.duration,
      platform: event.platform || '',
      services: event.services || [],
      remark: event.remark || '',
      images: event.images || [],
      status: 'pending', // 待审核
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('reports').add({
      data: report
    })

    return {
      success: true,
      data: {
        _id: result._id,
        ...report
      }
    }
  } catch (err) {
    console.error('提交报备失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
