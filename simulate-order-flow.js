
// 模拟小陈1创建订单和提交报备的完整流程
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  try {
    console.log('=== 开始模拟小陈1的业务流程 ===')
    
    // 1. 查找小陈1员工信息
    const staffResult = await db.collection('users')
      .where({
        nickname: '小陈1',
        role: 'Staff'
      })
      .get()
    
    if (staffResult.data.length === 0) {
      return { success: false, error: '找不到小陈1员工' }
    }
    
    const staff = staffResult.data[0]
    console.log('找到员工:', {
      nickname: staff.nickname,
      userId: staff.userId,
      _openid: staff._openid.substring(0, 8) + '...'
    })
    
    // 2. 查找小陈1的绑定老板
    const bindingResult = await db.collection('bindings')
      .where({
        staffId: staff._openid,
        status: 'active'
      })
      .get()
    
    if (bindingResult.data.length === 0) {
      return { success: false, error: '小陈1没有绑定老板' }
    }
    
    const bossResult = await db.collection('users')
      .where({
        _openid: bindingResult.data[0].bossId
      })
      .get()
    
    if (bossResult.data.length === 0) {
      return { success: false, error: '找不到对应的老板' }
    }
    
    const boss = bossResult.data[0]
    console.log('找到老板:', {
      nickname: boss.nickname,
      userId: boss.userId,
      _openid: boss._openid.substring(0, 8) + '...'
    })
    
    // 3. 模拟创建50元订单
    console.log('=== 创建50元订单 ===')
    const orderData = {
      bossId: boss._openid,
      staffId: staff._openid,
      game: '王者荣耀',
      duration: 2,
      date: new Date().toISOString().split('T')[0],
      position: 'mid',
      services: ['rank', 'voice'],
      remark: '模拟测试订单',
      amount: 50,
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const orderResult = await db.collection('orders').add({
      data: orderData
    })
    
    console.log('订单创建成功:', orderResult._id)
    
    // 4. 模拟提交报备
    console.log('=== 提交报备 ===')
    const reportData = {
      bossId: boss._openid,
      staffId: staff._openid,
      game: '王者荣耀',
      duration: 2,
      date: new Date().toISOString().split('T')[0],
      platform: 'bixin',
      services: ['game', 'voice'],
      remark: '模拟测试报备',
      images: [],
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const reportResult = await db.collection('reports').add({
      data: reportData
    })
    
    console.log('报备提交成功:', reportResult._id)
    
    // 5. 验证订单是否创建成功
    const createdOrder = await db.collection('orders').doc(orderResult._id).get()
    const createdReport = await db.collection('reports').doc(reportResult._id).get()
    
    console.log('=== 验证结果 ===')
    console.log('订单数据:', {
      _id: createdOrder.data._id,
      bossId: createdOrder.data.bossId.substring(0, 8) + '...',
      staffId: createdOrder.data.staffId.substring(0, 8) + '...',
      amount: createdOrder.data.amount,
      status: createdOrder.data.status
    })
    
    console.log('报备数据:', {
      _id: createdReport.data._id,
      bossId: createdReport.data.bossId.substring(0, 8) + '...',
      staffId: createdReport.data.staffId.substring(0, 8) + '...',
      status: createdReport.data.status
    })
    
    return {
      success: true,
      message: '模拟完成',
      data: {
        staff: {
          nickname: staff.nickname,
          userId: staff.userId
        },
        boss: {
          nickname: boss.nickname,
          userId: boss.userId
        },
        orderId: orderResult._id,
        reportId: reportResult._id
      }
    }
    
  } catch (error) {
    console.error('模拟失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
