// 员工端 - 我的老板
Page({
  data: {
    bossList: [] as Array<any>,
    loading: true
  },

  onLoad() {
    this.loadBosses()
  },

  onBack() {
    wx.navigateBack()
  },

  loadBosses() {
    wx.cloud.callFunction({
      name: 'manageBindings',
      data: { action: 'getMyBosses' },
      success: (res: any) => {
        if (res.result?.success) {
          const bosses = res.result.data || []
          // 获取每个老板的详细信息
          this.loadBossDetails(bosses)
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  loadBossDetails(bosses: any[]) {
    if (bosses.length === 0) {
      this.setData({ bossList: [], loading: false })
      return
    }

    // 获取每个老板的钱包和消费信息
    const promises = bosses.map(boss => {
      return new Promise((resolve) => {
        wx.cloud.callFunction({
          name: 'getTotalRecharge',
          data: { targetUserId: boss._openid },
          success: (res: any) => {
            if (res.result?.success) {
              resolve({
                ...boss,
                balance: res.result.data?.balance || 0,
                totalConsumption: res.result.data?.totalConsumption || 0,
                vipLevel: res.result.data?.vipLevel || ''
              })
            } else {
              resolve({ ...boss, balance: 0, totalConsumption: 0 })
            }
          },
          fail: () => {
            resolve({ ...boss, balance: 0, totalConsumption: 0 })
          }
        })
      })
    })

    Promise.all(promises).then((results) => {
      this.setData({
        bossList: results,
        loading: false
      })
    })
  }
})
