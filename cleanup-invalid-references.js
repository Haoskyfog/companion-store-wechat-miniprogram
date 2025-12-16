
// 清理数据库中引用不存在用户的订单和报备记录
const cleanupInvalidReferences = async () => {
  console.log('=== 开始清理无效引用 ===')
  
  const db = wx.cloud.database()
  const _ = db.command
  
  try {
    // 1. 清理无效订单
    console.log('清理无效订单...')
    const allOrders = await db.collection('orders').get()
    const invalidOrders = []
    
    for (const order of allOrders.data) {
      let staffExists = false
      let bossExists = false
      
      try {
        const staffResult = await db.collection('users').doc(order.staffId).get()
        staffExists = !!staffResult.data
      } catch (err) {
        console.log('员工不存在:', order.staffId)
      }
      
      try {
        const bossResult = await db.collection('users').doc(order.bossId).get()
        bossExists = !!bossResult.data
      } catch (err) {
        console.log('老板不存在:', order.bossId)
      }
      
      if (!staffExists || !bossExists) {
        invalidOrders.push(order._id)
        console.log('发现无效订单:', order._id, '员工存在:', staffExists, '老板存在:', bossExists)
      }
    }
    
    // 删除无效订单
    if (invalidOrders.length > 0) {
      console.log('删除无效订单数量:', invalidOrders.length)
      for (const orderId of invalidOrders) {
        await db.collection('orders').doc(orderId).remove()
        console.log('已删除订单:', orderId)
      }
    }
    
    // 2. 清理无效报备
    console.log('清理无效报备...')
    const allReports = await db.collection('reports').get()
    const invalidReports = []
    
    for (const report of allReports.data) {
      let staffExists = false
      let bossExists = false
      
      try {
        const staffResult = await db.collection('users').doc(report.staffId).get()
        staffExists = !!staffResult.data
      } catch (err) {
        console.log('员工不存在:', report.staffId)
      }
      
      try {
        const bossResult = await db.collection('users').doc(report.bossId).get()
        bossExists = !!bossResult.data
      } catch (err) {
        console.log('老板不存在:', report.bossId)
      }
      
      if (!staffExists || !bossExists) {
        invalidReports.push(report._id)
        console.log('发现无效报备:', report._id, '员工存在:', staffExists, '老板存在:', bossExists)
      }
    }
    
    // 删除无效报备
    if (invalidReports.length > 0) {
      console.log('删除无效报备数量:', invalidReports.length)
      for (const reportId of invalidReports) {
        await db.collection('reports').doc(reportId).remove()
        console.log('已删除报备:', reportId)
      }
    }
    
    console.log('=== 清理完成 ===')
    console.log('删除订单:', invalidOrders.length, '删除报备:', invalidReports.length)
    
    wx.showToast({
      title: '清理完成',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('清理失败:', error)
    wx.showToast({
      title: '清理失败',
      icon: 'none'
    })
  }
}

cleanupInvalidReferences()

