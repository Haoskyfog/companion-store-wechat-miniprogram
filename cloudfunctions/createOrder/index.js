// 创建订单云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户角色（必须是员工或管理员）
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Staff', 'Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有员工或管理员可以创建订单'
      }
    }

    const currentUser = userResult.data[0]
    const actualStaffId = event.actualStaffId || openid

    // 验证实际服务员工是否存在且为员工角色
    if (actualStaffId !== openid) {
      // 验证实际服务员工是否存在
      const actualStaffResult = await db.collection('users').where({
        _openid: actualStaffId,
        role: 'Staff'
      }).get()

      if (actualStaffResult.data.length === 0) {
        return {
          success: false,
          error: '选择的员工不存在或角色不正确'
        }
      }
    }

    // 验证绑定关系（创建订单的人与老板的绑定关系）
    // 服务员工可以选任何员工，但创建订单的人需要与老板有绑定关系
    const bindingResult = await db.collection('bindings').where({
      staffId: openid,
      bossId: event.bossId,
      status: 'active'
    }).get()

    if (bindingResult.data.length === 0) {
      return {
        success: false,
        error: '您未与该老板绑定，无法为其创建订单'
      }
    }

    // 验证并转换金额
    const amount = parseFloat(event.amount)
    
    // 调试日志
    console.log('接收到的金额:', event.amount, '类型:', typeof event.amount)
    console.log('转换后的金额:', amount, '类型:', typeof amount)
    
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: '请输入有效的服务金额'
      }
    }

    // 创建订单
    const order = {
      _openid: openid, // 创建订单的用户ID
      staffId: openid, // 订单归属员工（创建订单的人，用于统计）
      displayStaffId: actualStaffId, // 显示给老板看的服务员工
      bossId: event.bossId,
      game: event.game,
      duration: event.duration,
      date: event.date,
      position: event.position || '',
      remark: event.remark || '',
      services: event.services || [],
      amount: amount, // 服务金额（已验证为有效数字）
      paymentStatus: 'unpaid', // 支付状态：unpaid, paid, cancelled
      complaintStatus: 'none', // 客诉状态：none, processing, resolved
      status: 'pending', // 待老板确认
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('orders').add({
      data: order
    })

    return {
      success: true,
      data: {
        _id: result._id,
        ...order
      }
    }
  } catch (err) {
    console.error('创建订单失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
