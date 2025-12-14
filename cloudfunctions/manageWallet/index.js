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
    const { action, bossId, amount } = event

    // 验证管理员权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有管理员可以管理钱包'
      }
    }

    if (action === 'recharge') {
      // 给老板充值
      if (!bossId || !amount || amount <= 0) {
        return {
          success: false,
          error: '参数不正确'
        }
      }

      // 获取老板信息
      const bossResult = await db.collection('users').doc(bossId).get()
      if (!bossResult.data) {
        return {
          success: false,
          error: '老板用户不存在'
        }
      }

      // 更新老板钱包余额
      const currentBalance = bossResult.data.wallet?.balance || 0
      const newBalance = currentBalance + amount

      await db.collection('users').doc(bossId).update({
        data: {
          'wallet.balance': newBalance,
          updateTime: db.serverDate()
        }
      })

      return {
        success: true,
        data: {
          bossId,
          previousBalance: currentBalance,
          newBalance,
          amount
        }
      }
    } else if (action === 'getBalance') {
      // 获取老板余额
      if (!bossId) {
        return {
          success: false,
          error: '缺少老板ID'
        }
      }

      const bossResult = await db.collection('users').doc(bossId).get()
      if (!bossResult.data) {
        return {
          success: false,
          error: '老板用户不存在'
        }
      }

      return {
        success: true,
        data: {
          bossId,
          balance: bossResult.data.wallet?.balance || 0
        }
      }
    }

    return {
      success: false,
      error: '无效的操作'
    }
  } catch (err) {
    console.error('钱包管理失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}