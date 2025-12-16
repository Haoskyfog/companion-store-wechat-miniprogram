
// 在微信开发者工具中运行此代码来模拟完整业务流程
const simulateOrderFlow = async () => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'simulateOrderFlow'
    })
    
    console.log('模拟结果:', result)
    
    if (result.result.success) {
      wx.showModal({
        title: '模拟成功',
        content: `订单ID: ${result.result.data.orderId.substring(0, 8)}...
报备ID: ${result.result.data.reportId.substring(0, 8)}...`,
        showCancel: false
      })
    } else {
      wx.showModal({
        title: '模拟失败',
        content: result.result.error,
        showCancel: false
      })
    }
  } catch (error) {
    console.error('调用失败:', error)
    wx.showModal({
      title: '调用失败',
      content: error.message,
      showCancel: false
    })
  }
}

// 执行模拟
simulateOrderFlow()

