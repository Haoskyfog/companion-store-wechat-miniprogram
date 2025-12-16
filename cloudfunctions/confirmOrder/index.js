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
        error: '只有老板可以操作订单'
      }
    }

    const user = userResult.data[0]

    // 验证订单是否存在且属于该老板
    const orderResult = await db.collection('orders').doc(event.orderId).get()

    if (!orderResult.data || orderResult.data.bossId !== openid) {
      return {
        success: false,
        error: '订单不存在或不属于您'
      }
    }

    const order = orderResult.data

    // 调试日志：输出订单信息
    console.log('订单数据:', JSON.stringify(order, null, 2))
    console.log('订单金额:', order.amount, '类型:', typeof order.amount)
    console.log('用户余额:', user.walletBalance, '类型:', typeof user.walletBalance)

    // 处理不同操作
    let updateData = {
      updateTime: db.serverDate()
    }

    if (event.action === 'confirm') {
      // 确认订单并自动支付（将状态从pending改为completed，同时扣款）
      if (order.status !== 'pending') {
        return {
          success: false,
          error: '订单状态不允许确认'
        }
      }
      
      // 验证订单金额
      const orderAmount = parseFloat(order.amount)
      if (isNaN(orderAmount) || orderAmount <= 0) {
        return {
          success: false,
          error: `订单金额无效（金额：${order.amount}），请联系管理员`
        }
      }
      
      // 检查余额是否足够
      if (user.walletBalance < orderAmount) {
        return {
          success: false,
          error: `钱包余额不足。需要：¥${orderAmount.toFixed(2)}，当前余额：¥${user.walletBalance.toFixed(2)}`
        }
      }
      
      console.log('准备扣款，金额:', orderAmount)
      
      // 扣减余额并增加消费总额
      await db.collection('users').doc(user._id).update({
        data: {
          walletBalance: db.command.inc(-orderAmount),
          totalConsumption: db.command.inc(orderAmount),
          updateTime: db.serverDate()
        }
      })
      
      console.log('扣款成功')
      
      updateData.status = 'completed'
      updateData.paymentStatus = 'paid'
      updateData.paymentTime = db.serverDate()
    } else if (event.action === 'reject') {
      // 拒绝订单（将状态从pending改为cancelled）
      if (order.status !== 'pending') {
        return {
          success: false,
          error: '订单状态不允许拒绝'
        }
      }
      updateData.status = 'cancelled'
      updateData.paymentStatus = 'cancelled'
    } else if (event.action === 'pay') {
      // 支付订单
      if (order.status !== 'confirmed') {
        return {
          success: false,
          error: '订单状态不允许支付'
        }
      }
      if (order.paymentStatus !== 'unpaid') {
        return {
          success: false,
          error: '订单支付状态不允许支付'
        }
      }
      // 检查余额是否足够
      if (user.walletBalance < order.amount) {
        return {
          success: false,
          error: '钱包余额不足'
        }
      }
      // 扣减余额并增加消费总额
      await db.collection('users').doc(user._id).update({
        data: {
          walletBalance: db.command.inc(-order.amount),
          totalConsumption: db.command.inc(order.amount),
          updateTime: db.serverDate()
        }
      })
      updateData.paymentStatus = 'paid'
      updateData.paymentTime = db.serverDate()
      updateData.status = 'completed'
    } else if (event.action === 'cancel_payment') {
      // 取消支付（客诉）
      if (order.status !== 'confirmed') {
        return {
          success: false,
          error: '订单状态不允许取消支付'
        }
      }
      if (order.paymentStatus !== 'unpaid') {
        return {
          success: false,
          error: '订单支付状态不允许取消'
        }
      }
      updateData.paymentStatus = 'cancelled'
      updateData.status = 'cancelled'
      updateData.complaintStatus = 'processing'
    } else if (event.action === 'resolve_complaint') {
      // 解决客诉（管理员操作）
      if (!['Admin', 'SuperAdmin'].includes(user.role)) {
        return {
          success: false,
          error: '权限不足'
        }
      }
      if (order.complaintStatus !== 'processing') {
        return {
          success: false,
          error: '客诉状态不允许处理'
        }
      }
      updateData.complaintStatus = 'resolved'
      updateData.complaintReason = event.complaintReason || '已处理'
    } else {
      return {
        success: false,
        error: '无效的操作类型'
      }
    }

    // 更新订单状态
    await db.collection('orders').doc(event.orderId).update({
      data: updateData
    })

    // 计算新余额和返回金额
    let newBalance = user.walletBalance
    let returnAmount = 0
    
    if (event.action === 'confirm' || event.action === 'pay') {
      const deductAmount = parseFloat(order.amount) || 0
      newBalance = user.walletBalance - deductAmount
      returnAmount = deductAmount
    }

    console.log('返回数据 - 金额:', returnAmount, '新余额:', newBalance)

    return {
      success: true,
      data: {
        orderId: event.orderId,
        action: event.action,
        newBalance: newBalance,
        amount: returnAmount
      }
    }
  } catch (err) {
    console.error('订单操作失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}