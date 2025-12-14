// 老板端 - 员工列表页
Page({
  data: {
    staffList: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      voiceType?: string;
      introduction?: string;
      audioUrl?: string;
    }>,
    loading: true
  },

  onLoad() {
    this.loadStaffList()
  },

  // 加载员工列表
  loadStaffList() {
    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 100 // 获取所有员工
      },
      success: (res: any) => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          const staffList = res.result.data.users.map((staff: any) => ({
            _openid: staff._openid,
            nickname: staff.nickname,
            userId: staff.userId,
            avatar: staff.avatar,
            voiceType: staff.voiceSettings?.voiceType,
            introduction: staff.voiceSettings?.introduction,
            audioUrl: staff.voiceSettings?.audioUrl
          }))

          this.setData({
            staffList,
            loading: false
          })
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载员工列表失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 查看员工详情
  viewStaffDetail(e: any) {
    const staff = e.currentTarget.dataset.staff
    wx.navigateTo({
      url: `/pages/boss/staff-detail/index?staffId=${staff._openid}`
    })
  },

  // 播放员工音频
  playStaffAudio(e: any) {
    e.stopPropagation() // 阻止冒泡，避免触发详情查看

    const audioUrl = e.currentTarget.dataset.audio

    if (!audioUrl) {
      wx.showToast({
        title: '暂无音频',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '加载音频...' })

    wx.downloadFile({
      url: audioUrl,
      success: (res) => {
        wx.hideLoading()

        if (res.statusCode === 200 && res.tempFilePath) {
          const audioContext = wx.createInnerAudioContext()
          audioContext.src = res.tempFilePath
          audioContext.play()

          wx.showToast({
            title: '开始播放',
            icon: 'success',
            duration: 1500
          })
        } else {
          wx.showToast({
            title: '音频加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('下载音频失败:', err)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      }
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStaffList()
  }
})