// 员工端 - 提交报备
Page({
  data: {
    games: ['王者荣耀', '和平精英', '英雄联盟', '原神', '其他'],
    selectedGame: '王者荣耀',
    durations: [
      { label: '1小时', value: 1, selected: false },
      { label: '2小时', value: 2, selected: false },
      { label: '3小时', value: 3, selected: true },
      { label: '4小时', value: 4, selected: false }
    ],
    date: '',
    platforms: [
      { label: '比心', value: 'bixin', selected: true },
      { label: '闪电鱼', value: 'shandiangyu', selected: false },
      { label: '小鹿陪玩', value: 'xiaolu', selected: false },
      { label: '其他', value: 'other', selected: false }
    ],
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
    // 设置默认日期为昨天
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
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
                  wx.cloud.database().collection('users').doc(binding.bossId).get()
                )

                Promise.all(bossPromises).then((bossResults: any[]) => {
                  const bossList = bossResults
                    .filter(result => result.data)
                    .map(result => result.data)
                  this.setData({
                    bossList,
                    selectedBossId: bossList.length > 0 ? bossList[0]._openid : ''
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

  onPlatformSelect(e: any) {
    const value = e.currentTarget.dataset.value
    const platforms = this.data.platforms.map(item => ({
      ...item,
      selected: item.value === value
    }))
    this.setData({ platforms })
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

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    const selectedDuration = this.data.durations.find(d => d.selected)
    const selectedPlatform = this.data.platforms.find(p => p.selected)
    const selectedServices = this.data.services.filter(s => s.checked).map(s => s.value)

    wx.cloud.callFunction({
      name: 'submitReport',
      data: {
        bossId: this.data.selectedBossId,
        game: this.data.selectedGame,
        duration: selectedDuration?.value || 3,
        date: this.data.date,
        platform: selectedPlatform?.value || '',
        services: selectedServices,
        remark: this.data.remark,
        images: this.data.images
      },
      success: (res: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })

        if (res.result && res.result.success) {
          wx.showToast({
            title: '报备提交成功',
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
    const selectedServices = this.data.services.filter(s => s.checked)
    if (selectedServices.length === 0) {
      wx.showToast({ title: '请至少选择一项服务内容', icon: 'none' })
      return false
    }
    return true
  }
})
