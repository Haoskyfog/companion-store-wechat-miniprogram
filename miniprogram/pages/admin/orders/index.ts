// 管理员端 - 订单管理
const pagePath = 'pages/admin/orders/index';

Page({
  data: {
    orders: [] as Array<{
      _id: string;
      staffInfo: { nickname: string; userId: string };
      bossInfo: { nickname: string; userId: string };
      game: string;
      duration: number;
      date: string;
      position: string;
      services: string[];
      status: string;
      amount: number;
      paymentStatus: string;
      complaintStatus: string;
      complaintReason?: string;
      remark: string;
      createTime: string;
    }>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    paymentFilter: '' // 支付状态筛选（全部、已支付、已取消）
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
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
        paymentStatus: this.data.paymentFilter,
        adminView: true // 管理员查看模式
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
          console.error('getOrders返回失败:', res.result)
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: res.result?.error || '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载订单失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误: ' + (err.errMsg || err.message || '未知错误'), icon: 'none' })
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
        paymentStatus: this.data.paymentFilter,
        adminView: true
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

  // 支付状态筛选
  onPaymentFilter(e: any) {
    const paymentStatus = e.currentTarget.dataset.payment
    this.setData({
      paymentFilter: paymentStatus,
      page: 1,
      hasMore: true,
      loading: true
    })
    this.loadOrders()
  },

  // 处理客诉
  onHandleComplaint(e: any) {
    const { orderId } = e.currentTarget.dataset
    const order = this.data.orders.find(o => o._id === orderId)

    if (!order) return

    wx.showModal({
      title: '处理客诉',
      content: `处理 ${order.bossInfo.nickname} 对 ${order.staffInfo.nickname} 的客诉\n\n订单金额：¥${order.amount.toFixed(2)}`,
      editable: true,
      placeholderText: '请输入处理结果...',
      success: (res) => {
        if (res.confirm && res.content) {
          this.resolveComplaint(orderId, res.content)
        }
      }
    })
  },

  // 解决客诉
  resolveComplaint(orderId: string, reason: string) {
    wx.showLoading({ title: '处理中...' })
    wx.cloud.callFunction({
      name: 'confirmOrder',
      data: {
        orderId,
        action: 'resolve_complaint',
        complaintReason: reason
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '客诉已处理',
            icon: 'success'
          })
          // 刷新订单列表
          this.loadOrders(true)
        } else {
          wx.showToast({
            title: res.result?.error || '处理失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('处理客诉失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
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

  // 获取支付状态文本
  getPaymentStatusText(status: string) {
    const statusMap = {
      'unpaid': '未支付',
      'paid': '已支付',
      'cancelled': '已取消'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取支付状态样式
  getPaymentStatusClass(status: string) {
    const classMap = {
      'unpaid': 'payment-unpaid',
      'paid': 'payment-paid',
      'cancelled': 'payment-cancelled'
    }
    return classMap[status as keyof typeof statusMap] || ''
  },

  // 获取客诉状态文本
  getComplaintStatusText(status: string) {
    const statusMap = {
      'none': '无客诉',
      'processing': '处理中',
      'resolved': '已解决'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取客诉状态样式
  getComplaintStatusClass(status: string) {
    const classMap = {
      'none': 'complaint-none',
      'processing': 'complaint-processing',
      'resolved': 'complaint-resolved'
    }
    return classMap[status as keyof typeof statusMap] || ''
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    return date.toLocaleDateString()
  }
})
