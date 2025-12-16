
// 使用真实存在的用户创建测试订单和报备
const createRealOrderAndReport = async () => {
  console.log('=== 创建真实用户的订单和报备 ===')
  
  const db = wx.cloud.database()
  
  try {
    // 1. 获取所有用户
    const usersResult = await db.collection('users').get()
    
    // 2. 找到小陈1
    const xiaoChen = usersResult.data.find(u => u.nickname === '小陈1' && u.role === 'Staff')
    if (!xiaoChen) {
      console.log('❌ 没有找到小陈1员工')
      return
    }
    
    // 3. 找到对应的老板（通过绑定关系）
    const binding = await db.collection('bindings')
      .where({
        staffId: xiaoChen._openid,
        status: 'active'
      })
      .get()
    
    if (binding.data.length === 0) {
      console.log('❌ 小陈1没有绑定关系')
      return
    }
    
    const boss = usersResult.data.find(u => u._openid === binding.data[0].bossId)
    if (!boss) {
      console.log('❌ 没有找到对应的老板')
      return
    }
    
    console.log('找到员工:', xiaoChen.nickname, '(ID:', xiaoChen.userId, ')')
    console.log('找到老板:', boss.nickname, '(ID:', boss.userId, ')')
    
    // 4. 创建订单
    console.log('创建订单...')
    const orderResult = await db.collection('orders').add({
      data: {
        bossId: boss._openid,
        staffId: xiaoChen._openid,
        game: '王者荣耀',
        duration: 2,
        date: new Date().toISOString().split('T')[0],
        position: 'mid',
        services: ['rank', 'voice'],
        remark: '真实用户测试订单',
        amount: 50,
        status: 'pending',
        paymentStatus: 'unpaid',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    console.log('✅ 订单创建成功:', orderResult._id)
    
    // 5. 创建报备
    console.log('创建报备...')
    const reportResult = await db.collection('reports').add({
      data: {
        bossId: boss._openid,
        staffId: xiaoChen._openid,
        game: '王者荣耀',
        duration: 2,
        date: new Date().toISOString().split('T')[0],
        platform: 'bixin',
        services: ['game', 'voice'],
        remark: '真实用户测试报备',
        images: [],
        status: 'pending',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    console.log('✅ 报备创建成功:', reportResult._id)
    
    wx.showToast({
      title: '创建成功',
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

createRealOrderAndReport()

