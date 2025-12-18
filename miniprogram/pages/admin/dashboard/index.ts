// 管理员端 - 仪表板
const pagePath = 'pages/admin/dashboard/index';

Page({
  data: {
    statistics: {
      users: {
        boss: 0,
        staff: 0,
        admin: 0,
        total: 0
      },
      orders: {
        total: 0,
        pending: 0,
        completed: 0
      },
      reports: {
        total: 0,
        pending: 0
      },
      bindings: {
        active: 0
      },
      requests: {
        pending: 0
      },
      revenue: {
        total: 0,
        totalDisplay: '0.00',
        dayTotal: 0,
        dayTotalDisplay: '0.00',
        monthTotal: 0,
        monthTotalDisplay: '0.00'
      }
    },
    todayLabel: '',
    monthLabel: '',
    recentReports: [] as Array<{
      _id: string;
      staffInfo: { nickname: string; userId: string };
      game: string;
      duration: number;
      createTime: string;
    }>,
    functions: [
      {
        id: 1,
        icon: '👥',
        label: '用户管理',
        desc: '角色管理',
        bgColor: '#f3e8ff',
        action: 'users'
      },
      {
        id: 2,
        icon: '💰',
        label: '老板充值',
        desc: '钱包充值',
        bgColor: '#dcfce7',
        action: 'recharge'
      },
      {
        id: 3,
        icon: '🔗',
        label: '绑定关系',
        desc: '老板员工绑定',
        bgColor: '#dbeafe',
        action: 'bindings'
      },
      {
        id: 4,
        icon: '✅',
        label: '审核中心',
        desc: '报备审核',
        bgColor: '#d1fae5',
        action: 'audit'
      },
      {
        id: 5,
        icon: '📝',
        label: '内容管理',
        desc: '轮播图管理',
        bgColor: '#fed7aa',
        action: 'content'
      },
      {
        id: 6,
        icon: '📋',
        label: '订单列表',
        desc: '订单管理',
        bgColor: '#fce7f3',
        action: 'orders'
      },
      {
        id: 12,
        icon: '🎁',
        label: '权益编辑',
        desc: '老板权益管理',
        bgColor: '#fef3c7',
        action: 'benefits'
      },
      {
        id: 7,
        icon: '📊',
        label: '数据统计',
        desc: '运营数据',
        bgColor: '#fef3c7',
        action: 'statistics'
      },
      {
        id: 8,
        icon: '🏠',
        label: '预览首页端',
        desc: '员工端首页预览',
        bgColor: '#e0e7ff',
        action: 'previewStaff'
      },
      {
        id: 9,
        icon: '👔',
        label: '预览推荐页',
        desc: '老板端推荐预览',
        bgColor: '#fef3c7',
        action: 'previewBoss'
      },
      {
        id: 10,
        icon: '📄',
        label: '最新报备',
        desc: '查看报备记录',
        bgColor: '#fce7f3',
        action: 'recentReports'
      },
      {
        id: 11,
        icon: '🔧',
        label: '清理重复数据',
        desc: '修复重复用户',
        bgColor: '#fee2e2',
        action: 'cleanupDuplicates'
      }
    ],
    loading: true,
    refreshing: false, // 防止重复刷新
    developerInfo: null as any,
    showTipPopup: false,
    tipQrcodeUrl: 'cloud://cloud1-7g62s1bob33a0a2c.636c-cloud1-7g62s1bob33a0a2c-1389576972/9ea0f021f156714ee25896664e094ca9.jpg'
  },

  onLoad() {
    this.updateDateLabels()
    this.loadDashboardData()
    this.loadDeveloperInfo()
  },

  // 加载开发者信息
  loadDeveloperInfo() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: { staffId: 'o1J6A1z69dB9Cp5QcY5zI-ZzW1Qw' },
      success: (res: any) => {
        if (res.result && res.result.success && res.result.data.users && res.result.data.users.length > 0) {
          this.setData({ developerInfo: res.result.data.users[0] })
        }
      }
    })
  },

  // 显示打赏弹窗
  showTipQrcode() {
    this.setData({ showTipPopup: true })
  },

  // 关闭打赏弹窗
  closeTipPopup() {
    this.setData({ showTipPopup: false })
  },

  updateDateLabels() {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    this.setData({
      todayLabel: `${month}月${day}日`,
      monthLabel: `${month}月`
    })
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
    // 不在onShow中自动刷新，避免卡住
  },

  // 刷新按钮点击
  onRefresh() {
    if (this.data.refreshing) {
      return // 如果正在刷新，直接返回
    }
    this.setData({ refreshing: true })
    wx.showLoading({ title: '刷新中...' })
    this.loadDashboardData(true)
  },

  onPullDownRefresh() {
    this.loadDashboardData(true)
  },

  // 加载仪表板数据
  loadDashboardData(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    // 加载统计数据
    wx.cloud.callFunction({
      name: 'getStatistics',
      success: (res: any) => {
        wx.hideLoading() // 确保隐藏loading
        if (res.result && res.result.success) {
          const data = res.result.data
          // 格式化流水显示
          data.revenue = data.revenue || {}
          data.revenue.totalDisplay = (typeof data.revenue.total === 'number') ? data.revenue.total.toFixed(2) : '0.00'
          data.revenue.dayTotalDisplay = (typeof data.revenue.dayTotal === 'number') ? data.revenue.dayTotal.toFixed(2) : '0.00'
          data.revenue.monthTotalDisplay = (typeof data.revenue.monthTotal === 'number') ? data.revenue.monthTotal.toFixed(2) : '0.00'
          
          this.setData({
            statistics: data,
            loading: false,
            refreshing: false // 重置刷新状态
          })
        } else {
          this.setData({ loading: false, refreshing: false })
        }
      },
      fail: (err: any) => {
        wx.hideLoading() // 确保隐藏loading
        console.error('获取统计数据失败:', err)
        this.setData({ loading: false, refreshing: false })
      },
      complete: () => {
        if (refresh) {
          wx.stopPullDownRefresh()
        }
      }
    })
  },


  // 功能按钮点击
  onFunctionTap(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'users':
        wx.navigateTo({ url: '/pages/admin/users/index' })
        break
      case 'recharge':
        wx.navigateTo({ url: '/pages/admin/recharge/index' })
        break
      case 'audit':
        wx.navigateTo({ url: '/pages/admin/audit/index' })
        break
      case 'content':
        wx.navigateTo({ url: '/pages/admin/content/index' })
        break
      case 'orders':
        wx.navigateTo({ url: '/pages/admin/orders/index' })
        break
      case 'statistics':
        wx.navigateTo({ url: '/pages/admin/statistics/index' })
        break
      case 'bindings':
        wx.navigateTo({ url: '/pages/admin/bindings/index' })
        break
      case 'previewStaff':
        wx.navigateTo({ url: '/pages/admin/preview-staff/index' })
        break
      case 'previewBoss':
        wx.navigateTo({ url: '/pages/admin/preview-boss/index' })
        break
      case 'recentReports':
        wx.navigateTo({ url: '/pages/admin/recent-reports/index' })
        break
      case 'benefits':
        wx.navigateTo({ url: '/pages/admin/benefits/index' })
        break
      case 'cleanupDuplicates':
        this.cleanupDuplicateUsers()
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },


  // 清理重复用户
  cleanupDuplicateUsers() {
    wx.showModal({
      title: '清理重复用户',
      content: '自动检测并清理重复的用户记录\n\n系统会保留角色最高/信息最完整的记录\n\n是否继续？',
      confirmText: '开始清理',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '检测中...' })

          wx.cloud.callFunction({
            name: 'cleanupDuplicateUsers',
            success: (res: any) => {
              wx.hideLoading()

              if (res.result && res.result.success) {
                const { deleted, duplicateCount } = res.result
                
                if (deleted === 0) {
                  wx.showToast({
                    title: '没有发现重复记录',
                    icon: 'success'
                  })
                } else {
                  wx.showModal({
                    title: '清理完成',
                    content: `✅ 成功清理！\n\n发现 ${duplicateCount} 个用户有重复\n删除了 ${deleted} 条重复记录`,
                    showCancel: false,
                    confirmText: '知道了',
                    success: () => {
                      // 刷新仪表板
                      this.loadDashboardData(true)
                    }
                  })
                }
              } else {
                wx.showModal({
                  title: '清理失败',
                  content: res.result?.error || '未知错误',
                  showCancel: false
                })
              }
            },
            fail: (err: any) => {
              wx.hideLoading()
              console.error('清理失败:', err)
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`

    return date.toLocaleDateString()
  }
})
