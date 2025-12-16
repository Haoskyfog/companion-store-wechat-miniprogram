// 员工端 - 创建订单
Page({
  data: {
    games: ['王者荣耀', '和平精英', '英雄联盟', '原神', '其他'],
    selectedGame: '王者荣耀',
    durations: [
      { label: '1小时', value: 1, selected: false },
      { label: '2小时', value: 2, selected: true },
      { label: '3小时', value: 3, selected: false },
      { label: '4小时', value: 4, selected: false }
    ],
    date: '',
    positions: [
      { label: '中路', value: 'mid', selected: true },
      { label: '打野', value: 'jungle', selected: false },
      { label: '上路', value: 'top', selected: false },
      { label: '下路', value: 'adc', selected: false },
      { label: '辅助', value: 'support', selected: false }
    ],
    services: [
      { label: '陪玩上分', value: 'rank', checked: true },
      { label: '语音聊天', value: 'voice', checked: false },
      { label: '娱乐模式', value: 'fun', checked: false }
    ],
    remark: '',
    amount: '',
    bossList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    selectedBossId: '',
    loading: false,
    submitting: false,
    selectedBossDisplay: ''
  },

  onLoad() {
    // 设置默认日期为明天
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    this.setData({ date: dateStr })

    // 获取可选择的绑定老板列表
    this.getBossList()
  },

  // 获取绑定老板列表
  getBossList() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (userRes: any) => {
        if (userRes.result && userRes.result.success) {
          const userInfo = userRes.result.data
          // 查询绑定关系
          wx.cloud.database().collection('bindings')
            .where({
              staffId: userInfo._openid,
              status: 'active'
            })
            .get()
            .then((bindingRes: any) => {
              wx.hideLoading()
              if (bindingRes.data && bindingRes.data.length > 0) {
                // 获取老板信息
                const bossPromises = bindingRes.data.map((binding: any) =>
                  wx.cloud.database().collection('users')
                    .where({ _openid: binding.bossId })
                    .get()
                )

                Promise.all(bossPromises).then((bossResults: any[]) => {
                  const bossList = bossResults
                    .filter(result => result.data && result.data.length > 0)
                    .map(result => result.data[0])
                  this.setData({
                    bossList,
                    selectedBossId: bossList.length > 0 ? bossList[0]._openid : '',
                    selectedBossDisplay: bossList.length > 0 ? `${bossList[0].nickname} (ID: ${bossList[0].userId})` : ''
                  })
                })
              } else {
                wx.showToast({ title: '暂无绑定老板', icon: 'none' })
              }
            })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('获取用户信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  onGameChange(e: any) {
    this.setData({
      selectedGame: this.data.games[e.detail.value]
    })
  },

  onDateChange(e: any) {
    this.setData({
      date: e.detail.value
    })
  },

  onDurationSelect(e: any) {
    const value = e.currentTarget.dataset.value
    const durations = this.data.durations.map(item => ({
      ...item,
      selected: item.value === value
    }))
    this.setData({ durations })
  },

  onPositionSelect(e: any) {
    const value = e.currentTarget.dataset.value
    const positions = this.data.positions.map(item => ({
      ...item,
      selected: item.value === value
    }))
    this.setData({ positions })
  },

  onServiceChange(e: any) {
    const services = this.data.services.map((item, index) => ({
      ...item,
      checked: e.detail.value.includes(item.value)
    }))
    this.setData({ services })
  },

  onBossChange(e: any) {
    const selectedBoss = this.data.bossList[e.detail.value]
    this.setData({
      selectedBossId: selectedBoss._openid,
      selectedBossDisplay: `${selectedBoss.nickname} (ID: ${selectedBoss.userId})`
    })
  },

  onRemarkInput(e: any) {
    this.setData({
      remark: e.detail.value
    })
  },

  onAmountInput(e: any) {
    const value = e.detail.value
    console.log('金额输入:', value, '类型:', typeof value)
    this.setData({
      amount: value
    })
  },

  // 提交订单
  onSubmit() {
    if (!this.validateForm()) {
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    const selectedDuration = this.data.durations.find(d => d.selected)
    const selectedPosition = this.data.positions.find(p => p.selected)
    const selectedServices = this.data.services.filter(s => s.checked).map(s => s.value)
    const amount = parseFloat(this.data.amount)

    console.log('提交订单 - 金额:', amount, '类型:', typeof amount)

    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        bossId: this.data.selectedBossId,
        game: this.data.selectedGame,
        duration: selectedDuration?.value || 2,
        date: this.data.date,
        position: selectedPosition?.value || '',
        services: selectedServices,
        remark: this.data.remark,
        amount: amount
      },
      success: (res: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })

        if (res.result && res.result.success) {
          wx.showToast({
            title: '订单提交成功',
            icon: 'success',
            duration: 2000
          })
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        } else {
          wx.showToast({
            title: res.result?.error || '提交失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        console.error('创建订单失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 表单验证
  validateForm() {
    if (!this.data.selectedBossId) {
      wx.showToast({ title: '请选择老板', icon: 'none' })
      return false
    }
    
    const amount = parseFloat(this.data.amount)
    console.log('验证金额 - 原始值:', this.data.amount, '转换后:', amount)
    
    if (!this.data.amount || isNaN(amount) || amount <= 0) {
      wx.showToast({ 
        title: `请输入有效的服务金额（当前：${this.data.amount}）`, 
        icon: 'none',
        duration: 3000 
      })
      return false
    }
    
    if (!this.data.date) {
      wx.showToast({ title: '请选择服务日期', icon: 'none' })
      return false
    }
    const selectedServices = this.data.services.filter(s => s.checked)
    if (selectedServices.length === 0) {
      wx.showToast({ title: '请至少选择一项服务', icon: 'none' })
      return false
    }
    return true
  }
})
