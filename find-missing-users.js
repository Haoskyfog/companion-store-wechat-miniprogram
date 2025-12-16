
// 检查具体的订单和报备数据，找出哪些用户被引用了但不存在
const findMissingUsers = async () => {
  console.log('=== 查找缺失的用户 ===')
  
  const db = wx.cloud.database()
  
  try {
    // 1. 获取所有订单中引用的用户ID
    const orders = await db.collection('orders').get()
    const orderUserIds = new Set()
    
    orders.data.forEach(order => {
      orderUserIds.add(order.staffId)
      orderUserIds.add(order.bossId)
    })
    
    // 2. 获取所有报备中引用的用户ID
    const reports = await db.collection('reports').get()
    const reportUserIds = new Set()
    
    reports.data.forEach(report => {
      reportUserIds.add(report.staffId)
      reportUserIds.add(report.bossId)
    })
    
    // 3. 合并所有引用的用户ID
    const allReferencedUserIds = new Set([...orderUserIds, ...reportUserIds])
    
    console.log('引用的用户ID数量:', allReferencedUserIds.size)
    
    // 4. 检查哪些用户不存在
    const existingUsers = await db.collection('users').get()
    const existingUserIds = new Set(existingUsers.data.map(user => user._openid))
    
    const missingUserIds = []
    allReferencedUserIds.forEach(userId => {
      if (!existingUserIds.has(userId)) {
        missingUserIds.push(userId)
      }
    })
    
    console.log('缺失的用户ID:', missingUserIds)
    
    // 5. 显示具体的缺失情况
    console.log('
=== 详细分析 ===')
    
    console.log('订单中缺失的用户:')
    orders.data.forEach(order => {
      if (!existingUserIds.has(order.staffId)) {
        console.log('  员工缺失 - 订单ID:', order._id, '员工ID:', order.staffId)
      }
      if (!existingUserIds.has(order.bossId)) {
        console.log('  老板缺失 - 订单ID:', order._id, '老板ID:', order.bossId)
      }
    })
    
    console.log('报备中缺失的用户:')
    reports.data.forEach(report => {
      if (!existingUserIds.has(report.staffId)) {
        console.log('  员工缺失 - 报备ID:', report._id, '员工ID:', report.staffId)
      }
      if (!existingUserIds.has(report.bossId)) {
        console.log('  老板缺失 - 报备ID:', report._id, '老板ID:', report.bossId)
      }
    })
    
    if (missingUserIds.length === 0) {
      console.log('✅ 没有缺失的用户，所有引用都是有效的')
    } else {
      console.log('❌ 发现', missingUserIds.length, '个缺失的用户ID')
    }
    
    wx.showToast({
      title: '分析完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('分析失败:', error)
    wx.showToast({
      title: '分析失败',
      icon: 'none'
    })
  }
}

findMissingUsers()

