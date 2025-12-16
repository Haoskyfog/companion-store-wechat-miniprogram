
// 测试修复后的云函数
const testFixedCloudFunctions = async () => {
  console.log('=== 测试修复后的云函数 ===')
  
  try {
    // 测试getOrders
    console.log('测试getOrders...')
    const ordersRes = await wx.cloud.callFunction({
      name: 'getOrders',
      data: { page: 1, pageSize: 10 }
    })
    
    console.log('getOrders结果:', ordersRes.result)
    
    if (ordersRes.result && ordersRes.result.success) {
      console.log('订单数量:', ordersRes.result.data.orders.length)
      ordersRes.result.data.orders.forEach((order, index) => {
        console.log(`订单${index + 1}:`, {
          staff: order.staffInfo?.nickname,
          boss: order.bossInfo?.nickname,
          status: order.status
        })
      })
    }
    
    // 测试getReports
    console.log('测试getReports...')
    const reportsRes = await wx.cloud.callFunction({
      name: 'getReports',
      data: { status: 'pending', page: 1, pageSize: 10 }
    })
    
    console.log('getReports结果:', reportsRes.result)
    
    if (reportsRes.result && reportsRes.result.success) {
      console.log('报备数量:', reportsRes.result.data.reports.length)
      reportsRes.result.data.reports.forEach((report, index) => {
        console.log(`报备${index + 1}:`, {
          staff: report.staffInfo?.nickname,
          boss: report.bossInfo?.nickname,
          status: report.status
        })
      })
    }
    
    wx.showToast({
      title: '测试完成',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('测试失败:', error)
    wx.showToast({
      title: '测试失败',
      icon: 'none'
    })
  }
}

testFixedCloudFunctions()

