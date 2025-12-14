// 管理员端 - 数据统计
const pagePath = 'pages/admin/statistics/index';

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
        confirmed: 0,
        completed: 0,
        cancelled: 0
      },
      reports: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      },
      bindings: {
        active: 0
      },
      requests: {
        pending: 0
      }
    },
    loading: true,
    charts: {
      userDistribution: [] as Array<{ name: string; value: number; color: string }>,
      orderStatus: [] as Array<{ name: string; value: number; color: string }>,
      reportStatus: [] as Array<{ name: string; value: number; color: string }>
    }
  },

  onLoad() {
    this.loadStatistics()
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
          const statistics = res.result.data

          // 准备图表数据
          const charts = {
            userDistribution: [
              { name: '老板', value: statistics.users.boss, color: '#7c3aed' },
              { name: '员工', value: statistics.users.staff, color: '#10b981' },
              { name: '管理员', value: statistics.users.admin, color: '#f59e0b' }
            ],
            orderStatus: [
              { name: '待确认', value: statistics.orders.pending, color: '#f59e0b' },
              { name: '已确认', value: statistics.orders.confirmed, color: '#3b82f6' },
              { name: '已完成', value: statistics.orders.completed, color: '#10b981' },
              { name: '已取消', value: statistics.orders.cancelled, color: '#ef4444' }
            ],
            reportStatus: [
              { name: '待审核', value: statistics.reports.pending, color: '#f59e0b' },
              { name: '已通过', value: statistics.reports.approved, color: '#10b981' },
              { name: '已驳回', value: statistics.reports.rejected, color: '#ef4444' }
            ]
          }

          this.setData({
            statistics,
            charts,
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

  // 获取百分比
  getPercentage(value: number, total: number): string {
    if (total === 0) return '0%'
    return Math.round((value / total) * 100) + '%'
  },

  // 获取状态颜色
  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'pending': '#f59e0b',
      'confirmed': '#3b82f6',
      'completed': '#10b981',
      'cancelled': '#ef4444',
      'approved': '#10b981',
      'rejected': '#ef4444'
    }
    return colorMap[status] || '#6b7280'
  }
})