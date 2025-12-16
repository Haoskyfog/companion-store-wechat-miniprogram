// 老板端 - 我的钱包
Page({
  data: {
    walletBalance: 0,
    paymentHistory: [] as Array<{
      _id: string;
      game: string;
      amount: number;
      paymentStatus: string;
      paymentTime: string;
      staffInfo: {
        nickname: string;
        userId: string;
      };
    }>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadWalletInfo()
  },

  onPullDownRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    this.loadWalletInfo(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePayments()
    }
  },

  // 加载钱包信息
  loadWalletInfo(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'manageWallet',
      data: {
        action: 'get_wallet_info'
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const payments = res.result.data.recentPayments.map((payment: any) => ({
            ...payment,
            paymentTime: this.formatTime(payment.paymentTime || payment.updateTime)
          }))

          if (refresh) {
            this.setData({
              walletBalance: res.result.data.walletBalance,
              paymentHistory: payments,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              walletBalance: res.result.data.walletBalance,
              paymentHistory: payments,
              loading: false,
              hasMore: payments.length === this.data.pageSize
            })
          }
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载钱包信息失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载更多支付记录
  loadMorePayments() {
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })

    wx.cloud.callFunction({
      name: 'manageWallet',
      data: {
        action: 'get_payment_history',
        page: nextPage,
        pageSize: this.data.pageSize
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const newPayments = res.result.data.payments.map((payment: any) => ({
            ...payment,
            paymentTime: this.formatTime(payment.paymentTime || payment.updateTime)
          }))

          this.setData({
            paymentHistory: [...this.data.paymentHistory, ...newPayments],
            hasMore: newPayments.length === this.data.pageSize
          })
        }
      },
      fail: (err: any) => {
        console.error('加载更多支付记录失败:', err)
        this.setData({ page: this.data.page - 1 }) // 恢复页码
      }
    })
  },

  // 获取支付状态文本
  getPaymentStatusText(status: string) {
    const statusMap = {
      'paid': '已支付',
      'cancelled': '已取消',
      'unpaid': '未支付'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取支付状态样式
  getPaymentStatusClass(status: string) {
    const classMap = {
      'paid': 'status-paid',
      'cancelled': 'status-cancelled',
      'unpaid': 'status-unpaid'
    }
    return classMap[status as keyof typeof statusMap] || ''
  },

  // 格式化时间
  formatTime(timeStr: string) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }
})
