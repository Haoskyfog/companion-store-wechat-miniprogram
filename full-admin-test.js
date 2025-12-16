
// 完整的管理员端功能测试脚本
// 1. 创建测试订单和报备数据
// 2. 验证管理员订单管理和报备审核功能

const fullAdminTest = async () => {
  try {
    console.log('=== 开始完整管理员端测试 ===')
    
    // 首先创建一些测试数据
    console.log('1. 创建测试订单和报备...')
    
    // 查询现有用户
    const users = await wx.cloud.database().collection('users').get()
    const staff = users.data.find(u => u.nickname === '小陈1' && u.role === 'Staff')
    const boss = users.data.find(u => u.role === 'Boss')
    
    if (staff && boss) {
      console.log('找到测试用户:', staff.nickname, boss.nickname)
      
      // 创建测试订单
      const orderResult = await wx.cloud.database().collection('orders').add({
        data: {
          bossId: boss._openid,
          staffId: staff._openid,
          game: '王者荣耀',
          duration: 2,
          date: new Date().toISOString().split('T')[0],
          position: 'mid',
          services: ['rank', 'voice'],
          remark: '管理员功能测试订单',
          amount: 50,
          status: 'pending',
          paymentStatus: 'unpaid',
          createTime: wx.cloud.database().serverDate(),
          updateTime: wx.cloud.database().serverDate()
        }
      })
      
      // 创建测试报备
      const reportResult = await wx.cloud.database().collection('reports').add({
        data: {
          bossId: boss._openid,
          staffId: staff._openid,
          game: '王者荣耀',
          duration: 2,
          date: new Date().toISOString().split('T')[0],
          platform: 'bixin',
          services: ['game', 'voice'],
          remark: '管理员功能测试报备',
          images: [],
          status: 'pending',
          createTime: wx.cloud.database().serverDate(),
          updateTime: wx.cloud.database().serverDate()
        }
      })
      
      console.log('测试数据创建成功')
      console.log('订单ID:', orderResult._id)
      console.log('报备ID:', reportResult._id)
    }
    
    // 等待一下数据同步
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('2. 测试订单管理功能...')
    
    // 测试订单管理
    const ordersResult = await wx.cloud.callFunction({
      name: 'getOrders',
      data: { page: 1, pageSize: 10 }
    })
    
    console.log('订单管理结果:', ordersResult.result)
    
    console.log('3. 测试报备审核功能...')
    
    // 测试报备审核
    const reportsResult = await wx.cloud.callFunction({
      name: 'getReports',
      data: { 
        status: 'pending',
        page: 1, 
        pageSize: 10 
      }
    })
    
    console.log('报备审核结果:', reportsResult.result)
    
    console.log('4. 测试页面跳转...')
    
    // 测试订单页面跳转
    wx.navigateTo({
      url: '/pages/admin/orders/index',
      success: () => console.log('订单页面跳转成功'),
      fail: (err) => console.error('订单页面跳转失败:', err)
    })
    
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/admin/audit/index',
        success: () => console.log('审核页面跳转成功'),
        fail: (err) => console.error('审核页面跳转失败:', err)
      })
    }, 2000)
    
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

fullAdminTest()

