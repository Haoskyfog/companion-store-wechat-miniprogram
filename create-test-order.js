
// 直接在数据库中创建测试订单
const createTestOrder = async () => {
  try {
    // 先查询用户
    const users = await wx.cloud.database().collection('users').get()
    console.log('用户列表:', users.data.map(u => ({nickname: u.nickname, role: u.role, _openid: u._openid.substring(0, 8) + '...'})))
    
    // 找到小陈1和老板
    const staff = users.data.find(u => u.nickname === '小陈1')
    const boss = users.data.find(u => u.role === 'Boss')
    
    if (!staff || !boss) {
      wx.showToast({ title: '找不到测试用户', icon: 'none' })
      return
    }
    
    console.log('找到员工:', staff.nickname, '老板:', boss.nickname)
    
    // 创建测试订单
    const orderData = {
      bossId: boss._openid,
      staffId: staff._openid,
      game: '王者荣耀',
      duration: 2,
      date: new Date().toISOString().split('T')[0],
      position: 'mid',
      services: ['rank', 'voice'],
      remark: '测试订单',
      amount: 50,
      status: 'pending',
      paymentStatus: 'unpaid',
      createTime: wx.cloud.database().serverDate(),
      updateTime: wx.cloud.database().serverDate()
    }
    
    const result = await wx.cloud.database().collection('orders').add({
      data: orderData
    })
    
    console.log('订单创建成功:', result._id)
    wx.showToast({
      title: '订单创建成功',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('创建失败:', error)
    wx.showToast({
      title: '创建失败',
      icon: 'none'
    })
  }
}

createTestOrder()

