
// 清理数据库中指向不存在用户的订单和报备数据
const cleanupOrphanedData = async () => {
  console.log('=== 开始清理孤立数据 ===')
  
  try {
    const db = wx.cloud.database()
    const _ = db.command
    
    // 1. 获取所有用户ID
    const allUsers = await db.collection('users').get()
    const validUserIds = new Set(allUsers.data.map(user => user._openid))
    console.log('数据库中有', validUserIds.size, '个有效用户')
    
    // 2. 检查订单数据
    const allOrders = await db.collection('orders').get()
    console.log('数据库中有', allOrders.data.length, '个订单')
    
    const orphanedOrders = []
    for (const order of allOrders.data) {
      if (!validUserIds.has(order.staffId) || !validUserIds.has(order.bossId)) {
        orphanedOrders.push(order._id)
        console.log('发现孤立订单:', order._id, 'staffId:', order.staffId, 'bossId:', order.bossId)
      }
    }
    
    // 3. 检查报备数据
    const allReports = await db.collection('reports').get()
    console.log('数据库中有', allReports.data.length, '个报备')
    
    const orphanedReports = []
    for (const report of allReports.data) {
      if (!validUserIds.has(report.staffId) || !validUserIds.has(report.bossId)) {
        orphanedReports.push(report._id)
        console.log('发现孤立报备:', report._id, 'staffId:', report.staffId, 'bossId:', report.bossId)
      }
    }
    
    // 4. 删除孤立数据（可选）
    if (orphanedOrders.length > 0 || orphanedReports.length > 0) {
      wx.showModal({
        title: '发现孤立数据',
        content: `发现 ${orphanedOrders.length} 个孤立订单和 ${orphanedReports.length} 个孤立报备。要删除这些数据吗？`,
        success: async (res) => {
          if (res.confirm) {
            // 删除孤立订单
            for (const orderId of orphanedOrders) {
              await db.collection('orders').doc(orderId).remove()
            }
            
            // 删除孤立报备
            for (const reportId of orphanedReports) {
              await db.collection('reports').doc(reportId).remove()
            }
            
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            })
          }
        }
      })
    } else {
      wx.showToast({
        title: '数据库干净，无需清理',
        icon: 'success'
      })
    }
    
  } catch (error) {
    console.error('清理失败:', error)
    wx.showToast({
      title: '清理失败',
      icon: 'none'
    })
  }
}

cleanupOrphanedData()

