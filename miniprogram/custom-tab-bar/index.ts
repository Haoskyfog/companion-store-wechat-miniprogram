type Role = 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin'

const roleTabs: Record<Role, Array<{ pagePath: string; text: string; icon: string; selectedIcon: string; emoji: string }>> = {
  Boss: [
    { pagePath: 'pages/boss/home/index', text: '首页', icon: '/assets/tab/home.png', selectedIcon: '/assets/tab/home-active.png', emoji: '🏢' },
    { pagePath: 'pages/boss/recommend/index', text: '推荐', icon: '/assets/tab/recommend.png', selectedIcon: '/assets/tab/recommend-active.png', emoji: '💎' },
    { pagePath: 'pages/boss/profile/index', text: '我的', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '👑' },
  ],
  Staff: [
    { pagePath: 'pages/staff/index/index', text: '首页', icon: '/assets/tab/home.png', selectedIcon: '/assets/tab/home-active.png', emoji: '🎮' },
    { pagePath: 'pages/staff/recommend/index', text: '推荐', icon: '/assets/tab/recommend.png', selectedIcon: '/assets/tab/recommend-active.png', emoji: '🎯' },
    { pagePath: 'pages/staff/home/index', text: '我的', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '🎪' },
  ],
  Admin: [
    { pagePath: 'pages/admin/dashboard/index', text: '仪表', icon: '/assets/tab/home.png', selectedIcon: '/assets/tab/home-active.png', emoji: '📈' },
    { pagePath: 'pages/admin/content/index', text: '内容', icon: '/assets/tab/recommend.png', selectedIcon: '/assets/tab/recommend-active.png', emoji: '✨' },
    { pagePath: 'pages/admin/users/index', text: '用户', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '👥' },
    { pagePath: 'pages/admin/audit/index', text: '审核', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '🔍' },
  ],
  SuperAdmin: [
    { pagePath: 'pages/admin/dashboard/index', text: '仪表', icon: '/assets/tab/home.png', selectedIcon: '/assets/tab/home-active.png', emoji: '📊' },
    { pagePath: 'pages/admin/content/index', text: '内容', icon: '/assets/tab/recommend.png', selectedIcon: '/assets/tab/recommend-active.png', emoji: '🎨' },
    { pagePath: 'pages/admin/users/index', text: '用户', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '👑' },
    { pagePath: 'pages/admin/audit/index', text: '审核', icon: '/assets/tab/profile.png', selectedIcon: '/assets/tab/profile-active.png', emoji: '⚡' },
  ],
}

Component({
  data: {
    role: 'Boss' as Role,
    roleClass: 'role-boss',
    list: roleTabs.Boss.map(item => ({ ...item, iconLoaded: true })),
    selected: 0,
  },
  lifetimes: {
    attached() {
      this.syncRole()
    },
  },
  methods: {
    syncRole(role?: Role) {
      const stored = (role || (wx.getStorageSync('role') as Role) || 'Boss') as Role
      const list = (roleTabs[stored] || roleTabs.Boss).map(item => ({ ...item, iconLoaded: true }))
      const roleClass = `role-${stored.toLowerCase()}`
      this.setData({ role: stored, roleClass, list })
    },
    setSelected(pagePath: string) {
      const index = this.data.list.findIndex((item) => item.pagePath === pagePath)
      if (index >= 0) {
        this.setData({ selected: index })
      }
    },
    onTap(e: WechatMiniprogram.BaseEvent) {
      const { path, index } = e.currentTarget.dataset as { path: string; index: number }
      if (typeof path === 'string') {
        this.setData({ selected: index })
        wx.switchTab({ 
          url: `/${path}`,
          fail: (err) => {
            console.error('switchTab失败:', err, 'path:', path)
            // 如果switchTab失败，尝试使用navigateTo
            wx.navigateTo({
              url: `/${path}`,
              fail: (err2) => {
                console.error('navigateTo也失败:', err2)
                wx.showToast({
                  title: '跳转失败',
                  icon: 'none'
                })
              }
            })
          }
        })
      }
    },

    onIconError(e: WechatMiniprogram.BaseEvent) {
      const { emoji } = e.currentTarget.dataset as { emoji: string }
      console.log('TabBar图标加载失败，使用emoji替代:', emoji)

      // 标记图标加载失败，显示emoji
      const list = this.data.list.map((item: any) => ({
        ...item,
        iconLoaded: false
      }))
      this.setData({ list })
    },
  },
})




