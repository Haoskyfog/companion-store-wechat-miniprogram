// 员工端 - 提交报备
Page({
  data: {
    games: ['王者荣耀', '和平精英', '英雄联盟', '原神', '其他'],
    selectedGame: '王者荣耀',
    duration: '',
    amount: '',
    date: '',
    services: [
      { label: '游戏陪玩', value: 'game', checked: true },
      { label: '语音聊天', value: 'voice', checked: true },
      { label: '技术指导', value: 'guide', checked: false }
    ],
    remark: '',
    images: [] as string[],
    bossList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    selectedBossId: '',
    submitting: false,
    selectedBossDisplay: ''
  },

  onLoad() {
    console.log('报备页面onLoad开始')

    // 设置默认日期为昨天
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    // 初始化所有数据字段
    this.setData({
      date: dateStr,
      duration: '',
      amount: '',
      remark: '',
      selectedGame: '王者荣耀',
      bossList: [],
      selectedBossId: '',
      selectedBossDisplay: '',
      submitting: false,
      games: ['王者荣耀', '和平精英', '英雄联盟', '原神', '其他'],
      services: [
        { label: '游戏陪玩', value: 'game', checked: true },
        { label: '语音聊天', value: 'voice', checked: true },
        { label: '技术指导', value: 'guide', checked: false }
      ],
      images: []
    })

    console.log('报备页面数据初始化完成')

    // 获取可选择的绑定老板列表
    this.getBossList()
  },

  // 获取所有老板列表
  getBossList() {
    wx.showLoading({ title: '加载中...' })
    
    // 直接查询所有角色为 Boss 的用户
    wx.cloud.database().collection('users')
            .where({
        role: 'Boss'
            })
            .get()
      .then((bossRes: any) => {
              wx.hideLoading()
        
        if (bossRes.data && bossRes.data.length > 0) {
          const bossList = bossRes.data.map((boss: any) => ({
            _openid: boss._openid,
            nickname: boss.nickname || '未设置昵称',
            userId: boss.userId || ''
          }))
          
                  this.setData({
                    bossList,
            selectedBossId: bossList.length > 0 ? bossList[0]._openid : '',
            selectedBossDisplay: bossList.length > 0 ? `${bossList[0].nickname} (ID: ${bossList[0].userId})` : ''
                })
              } else {
          wx.showToast({ title: '暂无老板用户', icon: 'none' })
        }
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('获取老板列表失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
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

  onDurationInput(e: any) {
    this.setData({
      duration: e.detail.value
    })
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

  onAmountInput(e: any) {
    this.setData({
      amount: e.detail.value
    })
  },

  onRemarkInput(e: any) {
    this.setData({
      remark: e.detail.value
    })
  },

  // 上传图片
  onUploadImage() {
    wx.chooseImage({
      count: 3 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' })
        const uploadPromises = res.tempFilePaths.map(filePath =>
          wx.cloud.uploadFile({
            cloudPath: `reports/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
            filePath
          })
        )

        Promise.all(uploadPromises).then((uploadResults: any[]) => {
          wx.hideLoading()
          const newImages = uploadResults.map(result => result.fileID)
          this.setData({
            images: [...this.data.images, ...newImages]
          })
        }).catch((err) => {
          wx.hideLoading()
          console.error('上传失败:', err)
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  },

  // 删除图片
  onDeleteImage(e: any) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交报备
  onSubmit() {
    if (!this.validateForm()) {
      return
    }

    // 防止重复提交
    if (this.data.submitting) {
      wx.showToast({
        title: '正在提交中，请稍候',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    // 显示提交中状态，不显示loading（避免用户认为卡住了）
    wx.showToast({
      title: '提交中...',
      icon: 'loading',
      duration: 30000 // 30秒超时
    })

    const selectedServices = this.data.services.filter(s => s.checked).map(s => s.value)

    // 调试信息
    console.log('提交报备数据:', {
      bossId: this.data.selectedBossId,
      game: this.data.selectedGame,
      duration: this.data.duration,
      durationParsed: parseFloat(this.data.duration) || 0,
      amount: this.data.amount,
      amountType: typeof this.data.amount,
      amountParsed: parseFloat(this.data.amount),
      date: this.data.date,
      services: selectedServices,
      remark: this.data.remark,
      imagesCount: this.data.images.length
    })

    // 确保amount是有效的数字
    const amountValue = this.data.amount && this.data.amount.trim() !== '' ? parseFloat(this.data.amount) : 0

    wx.cloud.callFunction({
      name: 'submitReport',
      data: {
        bossId: this.data.selectedBossId,
        game: this.data.selectedGame,
        duration: parseFloat(this.data.duration) || 0,
        amount: amountValue,
        date: this.data.date,
        services: selectedServices,
        remark: this.data.remark,
        images: this.data.images
      },
      success: (res: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })

        if (res.result && res.result.success) {
          wx.hideToast() // 隐藏提交中的提示

          wx.showToast({
            title: '报备提交成功',
            icon: 'success',
            duration: 1500
          })

          // 立即返回上一页
          setTimeout(() => {
            wx.navigateBack({
              fail: () => {
                // 如果返回失败，尝试切换到上一页
                wx.switchTab({
                  url: '/pages/staff/home/index'
                })
              }
            })
          }, 1500)
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
        console.error('提交报备失败:', err)
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
      wx.showToast({ title: '请选择关联老板', icon: 'none' })
      return false
    }
    if (!this.data.date) {
      wx.showToast({ title: '请选择接单日期', icon: 'none' })
      return false
    }
    if (!this.data.duration || this.data.duration.trim() === '') {
      wx.showToast({ title: '请输入服务时长', icon: 'none' })
      return false
    }
    const duration = parseFloat(this.data.duration)
    if (isNaN(duration) || duration <= 0) {
      wx.showToast({ title: '请输入有效的服务时长', icon: 'none' })
      return false
    }
    if (!this.data.amount || this.data.amount.trim() === '') {
      wx.showToast({ title: '请输入订单金额', icon: 'none' })
      return false
    }
    const amount = parseFloat(this.data.amount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效的订单金额', icon: 'none' })
      return false
    }
    if (amount > 10000) {
      wx.showToast({ title: '订单金额不能超过10000元', icon: 'none' })
      return false
    }
    const selectedServices = this.data.services.filter(s => s.checked)
    if (selectedServices.length === 0) {
      wx.showToast({ title: '请至少选择一项服务内容', icon: 'none' })
      return false
    }
    return true
  }
})
