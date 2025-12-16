
// 检查数据库中的订单数据和用户数据
const checkDatabaseIntegrity = async () => {
  console.log('=== 检查数据库完整性 ===')
  
  const db = wx.cloud.database()
  
  try {
    // 1. 检查所有订单
    const orders = await db.collection('orders').limit(20).get()
    console.log('订单数量:', orders.data.length)
    
    for (const order of orders.data) {
      console.log('订单:', {
        _id: order._id,
        staffId: order.staffId,
        bossId: order.bossId,
        status: order.status
      })
      
      // 检查员工是否存在
      try {
        const staff = await db.collection('users').doc(order.staffId).get()
        if (staff.data) {
          console.log('  ✓ 员工存在:', staff.data.nickname)
        } else {
          console.log('  ✗ 员工不存在:', order.staffId)
        }
      } catch (err) {
        console.log('  ✗ 获取员工失败:', order.staffId, err.message)
      }
      
      // 检查老板是否存在
      try {
        const boss = await db.collection('users').doc(order.bossId).get()
        if (boss.data) {
          console.log('  ✓ 老板存在:', boss.data.nickname)
        } else {
          console.log('  ✗ 老板不存在:', order.bossId)
        }
      } catch (err) {
        console.log('  ✗ 获取老板失败:', order.bossId, err.message)
      }
    }
    
    // 2. 检查所有用户
    const users = await db.collection('users').limit(20).get()
    console.log('用户数量:', users.data.length)
    users.data.forEach(user => {
      console.log('用户:', {
        _openid: user._openid.substring(0, 8) + '...',
        nickname: user.nickname,
        role: user.role
      })
    })
    
    wx.showToast({
      title: '检查完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('检查失败:', error)
    wx.showToast({
      title: '检查失败',
      icon: 'none'
    })
  }
}

checkDatabaseIntegrity()

