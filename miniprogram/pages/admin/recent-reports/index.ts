// 管理员 - 最新报备列表
Page({
  data: {
    reports: [] as Array<{
      _id: string;
      staffInfo: { nickname: string; userId: string };
      bossInfo?: { nickname: string };
      game: string;
      duration: number;
      amount: number;
      createTime: string;
      status: string;
    }>,
    loading: true,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadReports()
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      reports: [],
      hasMore: true
    })
    this.loadReports(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadReports()
    }
  },

  // 加载报备列表
  loadReports(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'getReports',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res: any) => {
        if (refresh) {
          wx.stopPullDownRefresh()
        }

        if (res.result && res.result.success) {
          const newReports = res.result.data.reports.map((report: any) => ({
            ...report,
            createTime: this.formatTime(report.createTime)
          }))

          this.setData({
            reports: this.data.page === 1 ? newReports : [...this.data.reports, ...newReports],
            loading: false,
            hasMore: newReports.length === this.data.pageSize
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        if (refresh) {
          wx.stopPullDownRefresh()
        }
        console.error('获取报备列表失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 查看报备详情
  onReportTap(e: any) {
    const reportId = e.currentTarget.dataset.id
    wx.showToast({
      title: '报备详情功能开发中',
      icon: 'none'
    })
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}`
  }
})
