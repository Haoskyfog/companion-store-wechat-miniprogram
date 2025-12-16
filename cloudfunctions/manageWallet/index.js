// 钱包管理云函数
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

    const user = userResult.data[0]

    // 根据操作类型处理不同的业务逻辑
    switch (event.action) {
      case 'get_balance':
        // 获取钱包余额
        return {
          success: true,
          data: {
            walletBalance: user.walletBalance || 0
          }
        }

      case 'get_wallet_info':
        // 获取钱包详细信息（包括余额和最近的支付记录）
        const orderResult = await db.collection('orders')
          .where({
            bossId: openid,
            paymentStatus: db.command.in(['paid', 'cancelled'])
          })
          .orderBy('updateTime', 'desc')
          .limit(10)
          .get()

        return {
          success: true,
          data: {
            walletBalance: user.walletBalance || 0,
            recentPayments: orderResult.data
          }
        }

      case 'admin_get_user_wallet':
        // 管理员获取指定用户的钱包信息
        if (!['Admin', 'SuperAdmin'].includes(user.role)) {
          return {
            success: false,
            error: '权限不足'
          }
        }

        const targetUserResult = await db.collection('users').doc(event.userId).get()
        if (!targetUserResult.data) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        const targetUser = targetUserResult.data
        return {
          success: true,
          data: {
            userId: targetUser._id,
            nickname: targetUser.nickname,
            userIdStr: targetUser.userId,
            walletBalance: targetUser.walletBalance || 0
          }
        }

      case 'admin_update_wallet':
        // 管理员修改用户钱包余额
        if (!['Admin', 'SuperAdmin'].includes(user.role)) {
          return {
            success: false,
            error: '权限不足'
          }
        }

        const updateAmount = parseFloat(event.amount)
        if (isNaN(updateAmount)) {
          return {
            success: false,
            error: '无效的金额'
          }
        }

        const currentTargetUserResult = await db.collection('users').doc(event.userId).get()
        if (!currentTargetUserResult.data) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        const currentTargetUser = currentTargetUserResult.data
        const newBalance = (currentTargetUser.walletBalance || 0) + updateAmount

        if (newBalance < 0) {
          return {
            success: false,
            error: '余额不能为负数'
          }
        }

        // 更新用户钱包余额
        await db.collection('users').doc(event.userId).update({
          data: {
            walletBalance: newBalance,
            updateTime: db.serverDate()
          }
        })

        // 创建充值记录
        await db.collection('recharge_records').add({
          data: {
            targetUserId: event.userId,
            operatorId: openid,
            amount: updateAmount,
            type: 'admin_recharge',
            status: 'success',
            description: `管理员充值 ${updateAmount > 0 ? '+' : ''}${updateAmount}元`,
            oldBalance: currentTargetUser.walletBalance || 0,
            newBalance: newBalance,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          data: {
            userId: event.userId,
            oldBalance: currentTargetUser.walletBalance || 0,
            newBalance: newBalance,
            changeAmount: updateAmount
          }
        }

      case 'get_payment_history':
        // 获取支付历史记录
        const historyResult = await db.collection('orders')
          .where({
            bossId: openid,
            paymentStatus: db.command.in(['paid', 'cancelled'])
          })
          .orderBy('updateTime', 'desc')
          .skip(event.page * event.pageSize || 0)
          .limit(event.pageSize || 20)
          .get()

        // 获取员工信息
        const staffPromises = historyResult.data.map(async (order) => {
          const staffResult = await db.collection('users')
            .where({ _openid: order.staffId })
            .get()
          return {
            ...order,
            staffInfo: (staffResult.data && staffResult.data.length > 0) ? {
              nickname: staffResult.data[0].nickname,
              userId: staffResult.data[0].userId,
              avatar: staffResult.data[0].avatar || null
            } : {
              nickname: '员工已删除',
              userId: '未知',
              avatar: null
            }
          }
        })

        const historyWithStaff = await Promise.all(staffPromises)

        return {
          success: true,
          data: {
            payments: historyWithStaff,
            hasMore: historyResult.data.length === (event.pageSize || 20)
          }
        }

      default:
        return {
          success: false,
          error: '无效的操作类型'
        }
    }
  } catch (err) {
    console.error('钱包管理操作失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}