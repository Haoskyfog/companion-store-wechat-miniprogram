// 登录与角色页面 - 自动跳转到对应角色页面
const app = getApp<IAppOption>()

Page({
  data: {
    loading: true,
    message: '正在加载...'
  },
  
  onLoad() {
    // 页面加载时自动跳转
    this.redirectToRolePage()
  },

  onShow() {
    // 如果从其他页面返回，重新检查角色并跳转
    this.redirectToRolePage()
  },

  // 根据角色跳转到对应页面
  redirectToRolePage() {
    this.setData({ loading: true, message: '正在获取用户信息...' })
    
    // 先尝试从缓存获取角色
    const cachedRole = wx.getStorageSync('role') || 'Boss'
    const role = cachedRole as 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin'
    
    // 调用云函数获取最新用户信息
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        let finalRole = role
        
        if (res.result && res.result.success && res.result.data) {
          // 更新全局角色
          if (res.result.data.role) {
            finalRole = res.result.data.role
            app.setRole(finalRole)
          }
        }
        
        // 根据角色跳转
        this.navigateToRolePage(finalRole)
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
        // 失败时使用缓存角色跳转
        this.navigateToRolePage(role)
      }
    })
  },

  // 跳转到对应角色的首页
  navigateToRolePage(role: 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin') {
    let targetPath = ''
    
    switch (role) {
      case 'Boss':
        targetPath = '/pages/boss/home/index'
        break
      case 'Staff':
        targetPath = '/pages/staff/index/index'
        break
      case 'Admin':
      case 'SuperAdmin':
        targetPath = '/pages/admin/dashboard/index'
        break
      default:
        targetPath = '/pages/boss/home/index' // 默认老板端
    }
    
    // 使用 switchTab 跳转（如果是 tabBar 页面）或 redirectTo（如果不是）
    const tabBarPages = [
      '/pages/boss/home/index',
      '/pages/boss/recommend/index',
      '/pages/boss/profile/index',
      '/pages/staff/index/index',
      '/pages/staff/recommend/index',
      '/pages/staff/home/index'
    ]
    
    if (tabBarPages.includes(targetPath)) {
      wx.switchTab({
        url: targetPath,
        fail: () => {
          // 如果 switchTab 失败，使用 redirectTo
          wx.redirectTo({ url: targetPath })
        }
      })
    } else {
      wx.redirectTo({ url: targetPath })
    }
  }
});
