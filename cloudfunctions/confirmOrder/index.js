// 老板确认/拒绝订单云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户角色（必须是老板）
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Boss', 'Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有老板可以确认订单'
      }
    }

    // 验证订单是否存在且属于该老板
    const orderResult = await db.collection('orders').doc(event.orderId).get()

    if (!orderResult.data || orderResult.data.bossId !== openid) {
      return {
        success: false,
        error: '订单不存在或不属于您'
      }
    }

    // 只能处理待确认的订单
    if (orderResult.data.status !== 'pending') {
      return {
        success: false,
        error: '订单状态不允许操作'
      }
    }

    const newStatus = event.action === 'confirm' ? 'confirmed' : 'cancelled'

    // 更新订单状态
    await db.collection('orders').doc(event.orderId).update({
      data: {
        status: newStatus,
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      data: {
        orderId: event.orderId,
        status: newStatus
      }
    }
  } catch (err) {
    console.error('确认订单失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}