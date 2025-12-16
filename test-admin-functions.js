
// 测试管理员端的订单管理和报备审核功能
const testAdminFunctions = async () => {
  try {
    console.log('=== 测试管理员订单管理 ===')
    
    // 测试getOrders云函数
    const ordersResult = await wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        page: 1,
        pageSize: 10
      }
    })
    
    console.log('getOrders结果:', ordersResult)
    
    if (ordersResult.result && ordersResult.result.success) {
      console.log('订单数量:', ordersResult.result.data.orders.length)
      console.log('订单示例:', ordersResult.result.data.orders.slice(0, 2))
    } else {
      console.log('getOrders失败:', ordersResult.result.error)
    }
    
    console.log('=== 测试管理员报备审核 ===')
    
    // 测试getReports云函数
    const reportsResult = await wx.cloud.callFunction({
      name: 'getReports',
      data: {
        status: 'pending',
        page: 1,
        pageSize: 10
      }
    })
    
    console.log('getReports结果:', reportsResult)
    
    if (reportsResult.result && reportsResult.result.success) {
      console.log('报备数量:', reportsResult.result.data.reports.length)
      console.log('报备示例:', reportsResult.result.data.reports.slice(0, 2))
    } else {
      console.log('getReports失败:', reportsResult.result.error)
    }
    
    wx.showToast({
      title: '测试完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('测试失败:', error)
    wx.showToast({
      title: '测试失败',
      icon: 'none'
    })
  }
}

testAdminFunctions()

