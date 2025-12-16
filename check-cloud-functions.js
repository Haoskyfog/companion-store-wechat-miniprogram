
// 检查云函数部署状态
const checkCloudFunctions = async () => {
  console.log('=== 检查云函数部署状态 ===')
  
  const functionsToCheck = ['getOrders', 'getReports', 'getUserInfo']
  
  for (const funcName of functionsToCheck) {
    try {
      console.log(`检查 ${funcName} 云函数...`)
      const startTime = Date.now()
      
      const result = await wx.cloud.callFunction({
        name: funcName,
        data: {} // 发送空数据测试基本连通性
      })
      
      const responseTime = Date.now() - startTime
      console.log(`${funcName} 响应时间: ${responseTime}ms`)
      console.log(`${funcName} 结果:`, result.result ? '成功' : '失败')
      
      if (!result.result) {
        console.error(`${funcName} 返回结果为空`)
      }
      
    } catch (error) {
      console.error(`${funcName} 调用失败:`, error)
    }
  }
  
  wx.showToast({
    title: '检查完成，查看控制台',
    icon: 'none'
  })
}

checkCloudFunctions()

