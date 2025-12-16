
// 测试管理员页面跳转
const testAdminNavigation = () => {
  console.log('测试管理员订单页面跳转...')
  wx.navigateTo({
    url: '/pages/admin/orders/index',
    success: () => {
      console.log('订单页面跳转成功')
      wx.showToast({
        title: '订单页面跳转成功',
        icon: 'success'
      })
    },
    fail: (err) => {
      console.error('订单页面跳转失败:', err)
      wx.showToast({
        title: '订单页面跳转失败',
        icon: 'none'
      })
    }
  })
  
  setTimeout(() => {
    console.log('测试管理员审核页面跳转...')
    wx.navigateTo({
      url: '/pages/admin/audit/index',
      success: () => {
        console.log('审核页面跳转成功')
        wx.showToast({
          title: '审核页面跳转成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('审核页面跳转失败:', err)
        wx.showToast({
          title: '审核页面跳转失败',
          icon: 'none'
        })
      }
    })
  }, 2000)
}

testAdminNavigation()

