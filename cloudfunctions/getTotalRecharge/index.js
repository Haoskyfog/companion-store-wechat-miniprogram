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
    // 验证调用者权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    // 支持查询指定用户（员工查看老板信息时使用）
    const targetUserId = event.targetUserId || openid
    
    // 如果查询其他用户，验证是否有绑定关系
    if (targetUserId !== openid) {
      const currentUser = userResult.data[0]
      // 员工可以查看绑定的老板
      if (currentUser.role === 'Staff') {
        const bindingCheck = await db.collection('bindings').where({
          staffId: openid,
          bossId: targetUserId,
          status: 'active'
        }).get()
        
        if (bindingCheck.data.length === 0) {
          return {
            success: false,
            error: '无权查看该用户信息'
          }
        }
      } else if (!['Admin', 'SuperAdmin'].includes(currentUser.role)) {
        return {
          success: false,
          error: '无权查看该用户信息'
        }
      }
    }

    // 获取目标用户信息
    const targetUserResult = await db.collection('users').where({
      _openid: targetUserId
    }).get()

    if (targetUserResult.data.length === 0) {
      return {
        success: false,
        error: '目标用户不存在'
      }
    }

    const targetUser = targetUserResult.data[0]

    // 从订单表中查询该老板已支付订单金额总和
    let totalConsumption = 0

    try {
      // 查询该老板已支付的订单
      const orderResult = await db.collection('orders').where({
        bossId: targetUserId,
        paymentStatus: 'paid' // 只计算已支付的订单
      }).get()

      totalConsumption = orderResult.data.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0)
    } catch (err) {
      // 如果查询失败，返回0
      console.log('订单查询失败，使用默认值0:', err.message)
      totalConsumption = 0
    }

    // 钱包余额从用户表获取
    const balance = targetUser.walletBalance || 0

    // 计算VIP等级（根据消费总额）
    const vipLevel = calculateVipLevel(totalConsumption)

    return {
      success: true,
      data: {
        totalConsumption,
        balance,
        vipLevel
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

// 根据消费总额计算VIP等级
function calculateVipLevel(totalAmount) {
  const levels = [
    { name: 'VIP1', amount: 0 },
    { name: 'VIP2', amount: 666 },
    { name: 'VIP3', amount: 1888 },
    { name: 'VIP4', amount: 3500 },
    { name: 'VIP5', amount: 6666 },
    { name: 'VIP6', amount: 10000 },
    { name: 'VIP7', amount: 18888 },
    { name: 'VIP8', amount: 38888 },
    { name: 'VIP9', amount: 66666 },
    { name: 'VIP10', amount: 88888 }
  ]

  let currentLevel = 'VIP1'
  for (const level of levels) {
    if (totalAmount >= level.amount) {
      currentLevel = level.name
    } else {
      break
    }
  }
  return currentLevel
}
