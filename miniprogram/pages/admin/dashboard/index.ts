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
        total: 0
      }
    },
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
        icon: '🔗',
        label: '绑定关系',
        desc: '老板员工绑定',
        bgColor: '#dbeafe',
        action: 'bindings'
      },
      {
        id: 3,
        icon: '✅',
        label: '审核中心',
        desc: '报备审核',
        bgColor: '#d1fae5',
        action: 'audit'
      },
      {
        id: 4,
        icon: '📝',
        label: '内容管理',
        desc: '轮播图管理',
        bgColor: '#fed7aa',
        action: 'content'
      },
      {
        id: 5,
        icon: '📋',
        label: '订单列表',
        desc: '订单管理',
        bgColor: '#fce7f3',
        action: 'orders'
      },
      {
        id: 6,
        icon: '📊',
        label: '数据统计',
        desc: '运营数据',
        bgColor: '#fef3c7',
        action: 'statistics'
      }
    ],
    loading: true
  },

  onLoad() {
    this.loadDashboardData()
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
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
        if (res.result && res.result.success) {
          this.setData({
            statistics: res.result.data,
            loading: false
          })
        }
      },
      fail: (err: any) => {
        console.error('获取统计数据失败:', err)
        this.setData({ loading: false })
      }
    })

    // 加载最近报备
    wx.cloud.callFunction({
      name: 'getReports',
      data: {
        page: 1,
        pageSize: 5
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const reports = res.result.data.reports.map((report: any) => ({
            ...report,
            createTime: this.formatTime(report.createTime)
          }))
          this.setData({
            recentReports: reports
          })
        }
      },
      fail: (err: any) => {
        console.error('获取最近报备失败:', err)
      }
    })

    if (refresh) {
      wx.stopPullDownRefresh()
    }
  },

  // 功能按钮点击
  onFunctionTap(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'users':
        wx.navigateTo({ url: '/pages/admin/users/index' })
        break
      case 'audit':
        wx.navigateTo({ url: '/pages/admin/audit/index' })
        break
      case 'content':
        wx.navigateTo({ url: '/pages/admin/content/index' })
        break
      case 'orders':
        wx.showToast({ title: '订单管理功能开发中', icon: 'none' })
        break
      case 'statistics':
        wx.navigateTo({ url: '/pages/admin/statistics/index' })
        break
      case 'bindings':
        wx.navigateTo({ url: '/pages/admin/bindings/index' })
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  // 查看更多报备
  onViewMoreReports() {
    wx.navigateTo({ url: '/pages/admin/audit/index' })
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
