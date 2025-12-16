
// 详细诊断管理员功能问题
const diagnoseAdminFunctions = async () => {
  console.log('=== 管理员功能诊断 ===')
  
  try {
    // 1. 检查当前用户信息
    console.log('1. 检查用户信息...')
    const userRes = await wx.cloud.callFunction({
      name: 'getUserInfo'
    })
    
    if (userRes.result && userRes.result.success) {
      const user = userRes.result.data
      console.log('当前用户:', {
        nickname: user.nickname,
        role: user.role,
        _openid: user._openid.substring(0, 8) + '...'
      })
    } else {
      console.log('获取用户信息失败:', userRes.result)
      return
    }
    
    // 2. 检查数据库中的数据
    console.log('2. 检查数据库数据...')
    
    const db = wx.cloud.database()
    
    // 检查订单
    const orders = await db.collection('orders').limit(5).get()
    console.log('数据库中的订单:', orders.data.length, '条')
    if (orders.data.length > 0) {
      console.log('订单示例:', orders.data[0])
    }
    
    // 检查报备
    const reports = await db.collection('reports').limit(5).get()
    console.log('数据库中的报备:', reports.data.length, '条')
    if (reports.data.length > 0) {
      console.log('报备示例:', reports.data[0])
    }
    
    // 3. 测试云函数调用
    console.log('3. 测试getOrders云函数...')
    const ordersRes = await wx.cloud.callFunction({
      name: 'getOrders',
      data: { page: 1, pageSize: 5 }
    })
    console.log('getOrders结果:', ordersRes)
    
    console.log('4. 测试getReports云函数...')
    const reportsRes = await wx.cloud.callFunction({
      name: 'getReports',
      data: { status: 'pending', page: 1, pageSize: 5 }
    })
    console.log('getReports结果:', reportsRes)
    
    wx.showToast({
      title: '诊断完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('诊断失败:', error)
    wx.showToast({
      title: '诊断失败',
      icon: 'none'
    })
  }
}

diagnoseAdminFunctions()

