
// 简单测试管理员云函数
const testAdminCloudFunctions = async () => {
  console.log('=== 测试getOrders云函数 ===')
  
  try {
    const ordersRes = await wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        page: 1,
        pageSize: 10,
        adminView: true
      }
    })
    
    console.log('getOrders响应:', ordersRes)
    
    if (ordersRes.result && ordersRes.result.success) {
      console.log('订单数据:', ordersRes.result.data)
    } else {
      console.log('getOrders失败:', ordersRes.result)
    }
    
  } catch (error) {
    console.error('getOrders调用失败:', error)
  }
  
  console.log('=== 测试getReports云函数 ===')
  
  try {
    const reportsRes = await wx.cloud.callFunction({
      name: 'getReports',
      data: {
        status: 'pending',
        page: 1,
        pageSize: 10
      }
    })
    
    console.log('getReports响应:', reportsRes)
    
    if (reportsRes.result && reportsRes.result.success) {
      console.log('报备数据:', reportsRes.result.data)
    } else {
      console.log('getReports失败:', reportsRes.result)
    }
    
  } catch (error) {
    console.error('getReports调用失败:', error)
  }
}

testAdminCloudFunctions()

