// 员工端 - 我的报备记录
Page({
  data: {
    reports: [] as Array<{
      _id: string;
      bossInfo: { nickname: string; userId: string };
      date: string;
      game: string;
      duration: number;
      amount: number;
      platform: string;
      services: string[];
      remark: string;
      images: string[];
      status: string;
      createTime: string;
      auditorInfo?: { nickname: string };
      auditRemark?: string;
      auditTime?: string;
    }>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    statusFilter: '', // 状态筛选：空字符串表示全部
    statusOptions: [
      { label: '全部', value: '' },
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已驳回', value: 'rejected' }
    ]
  },

  onLoad() {
    this.loadReports()
  },

  onPullDownRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    this.loadReports(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreReports()
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
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        status: this.data.statusFilter
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          console.log('收到报备数据:', res.result.data.reports)

          // 检查每个报备的amount字段
          res.result.data.reports.forEach((report: any, index: number) => {
            console.log(`报备${index + 1}的amount:`, report.amount, '类型:', typeof report.amount)
          })

          const reports = res.result.data.reports.map((report: any) => ({
            ...report,
            createTime: this.formatTime(report.createTime),
            auditTime: report.auditTime ? this.formatTime(report.auditTime) : undefined
          }))

          if (refresh) {
            this.setData({
              reports,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              reports,
              loading: false,
              hasMore: reports.length === this.data.pageSize
            })
          }
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载报备失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载更多报备
  loadMoreReports() {
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })

    wx.cloud.callFunction({
      name: 'getReports',
      data: {
        page: nextPage,
        pageSize: this.data.pageSize,
        status: this.data.statusFilter
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const newReports = res.result.data.reports.map((report: any) => ({
            ...report,
            createTime: this.formatTime(report.createTime),
            auditTime: report.auditTime ? this.formatTime(report.auditTime) : undefined
          }))

          this.setData({
            reports: [...this.data.reports, ...newReports],
            hasMore: newReports.length === this.data.pageSize
          })
        }
      },
      fail: (err: any) => {
        console.error('加载更多报备失败:', err)
        this.setData({ page: this.data.page - 1 }) // 恢复页码
      }
    })
  },

  // 状态筛选
  onStatusFilter(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({
      statusFilter: status,
      page: 1,
      hasMore: true,
      loading: true
    })
    this.loadReports()
  },

  // 预览图片
  onPreviewImage(e: any) {
    const { images, index } = e.currentTarget.dataset
    wx.previewImage({
      current: images[index],
      urls: images
    })
  },

  // 获取报备状态文本
  getStatusText(status: string) {
    const statusMap = {
      'pending': '待审核',
      'approved': '已通过',
      'rejected': '已驳回'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取报备状态样式
  getStatusClass(status: string) {
    const classMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected'
    }
    return classMap[status as keyof typeof classMap] || ''
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
    if (days < 30) return `${days}天前`

    return date.toLocaleDateString()
  },

  // 获取筛选状态样式
  getFilterClass(status: string) {
    return this.data.statusFilter === status ? 'filter-active' : 'filter-normal'
  }
})