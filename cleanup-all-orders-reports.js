// 删除所有订单和报备数据的脚本
// 在微信开发者工具云控制台中运行此代码

const db = cloud.database()

// 删除所有订单
async function deleteAllOrders() {
  console.log('开始删除所有订单...')
  
  try {
    // 获取所有订单
    const ordersResult = await db.collection('orders').get()
    console.log(`找到 ${ordersResult.data.length} 个订单`)
    
    if (ordersResult.data.length === 0) {
      console.log('没有订单需要删除')
      return
    }
    
    // 批量删除订单
    const batchSize = 20 // 每次删除20条
    let deletedCount = 0
    
    for (let i = 0; i < ordersResult.data.length; i += batchSize) {
      const batch = ordersResult.data.slice(i, i + batchSize)
      const deletePromises = batch.map(order => 
        db.collection('orders').doc(order._id).remove()
      )
      
      await Promise.all(deletePromises)
      deletedCount += batch.length
      console.log(`已删除 ${deletedCount}/${ordersResult.data.length} 个订单`)
    }
    
    console.log(`✅ 成功删除 ${deletedCount} 个订单`)
  } catch (error) {
    console.error('删除订单失败:', error)
    throw error
  }
}

// 删除所有报备
async function deleteAllReports() {
  console.log('开始删除所有报备...')
  
  try {
    // 获取所有报备
    const reportsResult = await db.collection('reports').get()
    console.log(`找到 ${reportsResult.data.length} 个报备`)
    
    if (reportsResult.data.length === 0) {
      console.log('没有报备需要删除')
      return
    }
    
    // 批量删除报备
    const batchSize = 20 // 每次删除20条
    let deletedCount = 0
    
    for (let i = 0; i < reportsResult.data.length; i += batchSize) {
      const batch = reportsResult.data.slice(i, i + batchSize)
      const deletePromises = batch.map(report => 
        db.collection('reports').doc(report._id).remove()
      )
      
      await Promise.all(deletePromises)
      deletedCount += batch.length
      console.log(`已删除 ${deletedCount}/${reportsResult.data.length} 个报备`)
    }
    
    console.log(`✅ 成功删除 ${deletedCount} 个报备`)
  } catch (error) {
    console.error('删除报备失败:', error)
    throw error
  }
}

// 主函数
async function cleanupAllData() {
  try {
    console.log('=== 开始清理所有订单和报备数据 ===')
    console.log('⚠️  警告：这将删除数据库中的所有订单和报备！')
    
    // 删除所有订单
    await deleteAllOrders()
    
    // 删除所有报备
    await deleteAllReports()
    
    console.log('=== 清理完成 ===')
    console.log('所有订单和报备数据已删除')
    
  } catch (error) {
    console.error('清理失败:', error)
  }
}

// 运行清理
cleanupAllData()
