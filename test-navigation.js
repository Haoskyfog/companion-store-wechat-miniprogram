// 测试页面跳转的脚本
// 在微信开发者工具中运行

console.log('测试页面跳转...')

// 测试老板充值页面跳转
wx.navigateTo({
  url: '/pages/admin/recharge/index',
  success: () => {
    console.log('✅ 老板充值页面跳转成功')
  },
  fail: (err) => {
    console.error('❌ 老板充值页面跳转失败:', err)
    console.log('请检查 app.json 是否包含 pages/admin/recharge/index 路径')
  }
})
