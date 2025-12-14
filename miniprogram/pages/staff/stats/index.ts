// 员工端 - 我的统计
const pagePath = 'pages/staff/stats/index';

Page({
  data: {
    statistics: {
      orders: {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        totalDuration: 0
      },
      reports: {
        total: 0,
        pending: 0,
        approved: 0
      }
    },
    loading: true,
    userInfo: {
      nickname: '',
      userId: '',
      avatar: ''
    }
  },

  onLoad() {
    this.loadStatistics()
    this.loadUserInfo()
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
  },

  onPullDownRefresh() {
    this.loadStatistics(true)
  },

  // 加载统计数据
  loadStatistics(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'getStatistics',
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            statistics: res.result.data,
            loading: false
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }

        if (refresh) {
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('获取统计数据失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载用户信息
  loadUserInfo() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        if (res.result && res.result.success) {
          const userInfo = res.result.data
          this.setData({
            userInfo: {
              nickname: userInfo.nickname || '未设置',
              userId: userInfo.userId || '未设置',
              avatar: userInfo.avatar || ''
            }
          })
        }
      },
      fail: (err: any) => {
        console.error('获取用户信息失败:', err)
      }
    })
  },

  // 格式化时长显示
  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分钟`
    }
    return `${hours}小时`
  },

  // 获取完成率
  getCompletionRate(): string {
    const { orders } = this.data.statistics
    if (orders.total === 0) return '0%'
    return Math.round((orders.completed / orders.total) * 100) + '%'
  },

  // 获取平均时长
  getAverageDuration(): string {
    const { orders } = this.data.statistics
    if (orders.completed === 0) return '0小时'
    const avg = orders.totalDuration / orders.completed
    return this.formatDuration(avg)
  }
})