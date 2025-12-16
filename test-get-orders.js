
// 测试getOrders云函数
const testGetOrders = async () => {
  try {
    console.log('测试getOrders云函数...')
    const result = await wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        page: 1,
        pageSize: 10
      }
    })
    
    console.log('getOrders结果:', result)
    
    if (result.result && result.result.success) {
      console.log('订单数据:', result.result.data.orders)
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
    } else {
      console.log('测试失败:', result.result.error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('调用失败:', error)
    wx.showToast({
      title: '调用失败',
      icon: 'none'
    })
  }
}

testGetOrders()

