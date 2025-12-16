// 员工端 - 我的订单
Page({
  data: {
    orders: [] as Array<{
      _id: string;
      bossInfo: { nickname: string; userId: string };
      game: string;
      duration: number;
      date: string;
      position: string;
      services: string[];
      status: string;
      remark: string;
      createTime: string;
    }>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    statusFilter: '', // 状态筛选：空字符串表示全部
    statusOptions: [
      { label: '全部', value: '' },
      { label: '已确认', value: 'confirmed' },
      { label: '已取消', value: 'cancelled' }
    ]
  },

  onLoad() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    this.loadOrders(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreOrders()
    }
  },

  // 加载订单列表
  loadOrders(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        status: this.data.statusFilter
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const orders = res.result.data.orders.map((order: any) => ({
            ...order,
            createTime: this.formatTime(order.createTime)
          }))

          if (refresh) {
            this.setData({
              orders,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              orders,
              loading: false,
              hasMore: orders.length === this.data.pageSize
            })
          }
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载订单失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载更多订单
  loadMoreOrders() {
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })

    wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        page: nextPage,
        pageSize: this.data.pageSize,
        status: this.data.statusFilter
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const newOrders = res.result.data.orders.map((order: any) => ({
            ...order,
            createTime: this.formatTime(order.createTime)
          }))

          this.setData({
            orders: [...this.data.orders, ...newOrders],
            hasMore: newOrders.length === this.data.pageSize
          })
        }
      },
      fail: (err: any) => {
        console.error('加载更多订单失败:', err)
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
    this.loadOrders()
  },

  // 获取订单状态文本
  getStatusText(status: string) {
    const statusMap = {
      'pending': '待确认',
      'confirmed': '已确认',
      'completed': '已完成',
      'cancelled': '已取消'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取订单状态样式
  getStatusClass(status: string) {
    const classMap = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
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