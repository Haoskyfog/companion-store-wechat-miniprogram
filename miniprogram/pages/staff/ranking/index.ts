// 员工端 - 排行榜
const pagePath = 'pages/staff/ranking/index';

Page({
  data: {
    rankings: [] as Array<{
      rank: number;
      staffId?: string;
      bossId?: string;
      userInfo: {
        nickname: string;
        userId: string;
        avatar?: string;
      };
      orderCount?: number;
      totalRevenue?: number;
      subordinateRevenue?: number;
      staffCount?: number;
      totalDuration?: number;
      rating?: number;
      ratingRounded?: number;
    }>,
    rankingType: 'staff', // 'staff' 或 'subordinate'
    periodType: 'total', // 'day', 'month', 'total'
    todayLabel: '',
    monthLabel: '',
    loading: true
  },

  onLoad() {
    this.updateDateLabels()
    this.loadRankings()
  },

  // 更新日期标签
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
    // 暂时注释掉角色检查，用于调试
    /*
    const app = getApp<IAppOption>();
    const userRole = app.globalData.role || wx.getStorageSync('role') || 'Boss';

    // 如果不是员工角色，给出提示并跳转
    if (userRole !== 'Staff') {
      wx.showToast({
        title: '权限不足',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/auth/index'
        });
      }, 2000);
      return;
    }
    */

    // 排行榜页面不是TabBar页面，不需要设置选中状态
    // const tabBar = this.getTabBar && this.getTabBar();
    // if (tabBar) {
    //   tabBar.syncRole && tabBar.syncRole('Staff');
    //   tabBar.setSelected && tabBar.setSelected(pagePath);
    // }
    
    // 每次显示时刷新排行榜数据
    this.loadRankings()
  },

  // 加载排行榜
  loadRankings() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getRankings',
      data: {
        type: this.data.rankingType,
        period: this.data.periodType
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const rankings = res.result.data.rankings.map((item: any) => {
            if (this.data.rankingType === 'subordinate') {
              // 直属排行榜
              const subordinateRevenue = typeof item.subordinateRevenue === 'number' ? item.subordinateRevenue : (Number(item.subordinateRevenue) || 0)

              return {
                ...item,
                subordinateRevenue: subordinateRevenue,
                subordinateRevenueDisplay: subordinateRevenue.toFixed(2),
              }
            } else {
              // 员工排行榜
              const totalRevenue = typeof item.totalRevenue === 'number' ? item.totalRevenue : (Number(item.totalRevenue) || 0)

              console.log('排行榜项:', {
                员工: item.userInfo?.nickname,
                个人流水: totalRevenue,
                流水类型: typeof totalRevenue
              })

              return {
                ...item,
                totalRevenue: totalRevenue,
                totalRevenueDisplay: totalRevenue.toFixed(2),
                ratingRounded: Math.round(item.rating || 95)
              }
            }
          })

          console.log('处理后的排行榜数据:', rankings)

          this.setData({
            rankings: rankings,
            loading: false
          })
        } else {
          console.error('加载失败:', res.result)
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载排行榜失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 切换排行榜类型
  switchRankingType(e: any) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.rankingType) return

    this.setData({
      rankingType: type,
      loading: true
    })
    this.loadRankings()
  },

  // 切换时间周期
  switchPeriod(e: any) {
    const period = e.currentTarget.dataset.period
    if (period === this.data.periodType) return

    this.setData({
      periodType: period,
      loading: true
    })
    this.loadRankings()
  },

  // 获取周期值
  getPeriodValue(period: string) {
    const now = new Date()
    switch (period) {
      case 'month':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3) + 1
        return `${now.getFullYear()}-Q${quarter}`
      case 'year':
        return `${now.getFullYear()}`
      default:
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
  },

  // 获取排名图标
  getRankIcon(rank: number) {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  },

  // 获取排名样式
  getRankClass(rank: number) {
    if (rank === 1) return 'rank-first'
    if (rank === 2) return 'rank-second'
    if (rank === 3) return 'rank-third'
    return 'rank-normal'
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  }
})
