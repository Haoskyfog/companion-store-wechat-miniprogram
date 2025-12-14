// 老板端 - 员工详情页
Page({
  data: {
    staff: null as any,
    loading: true
  },

  onLoad(options: any) {
    const staffId = options.staffId

    // 优先尝试从全局数据获取（更快）
    const app = getApp<IAppOption>()
    if (app.getStaffDetailData) {
      const staff = app.getStaffDetailData()
      if (staff) {
        this.setData({
          staff,
          loading: false
        })
        return
      }
    }

    // 如果全局数据不存在，通过staffId重新加载
    if (staffId) {
      this.loadStaffDetail(staffId)
    } else {
      wx.showToast({
        title: '缺少员工信息',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载员工详情
  loadStaffDetail(staffId: string) {
    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 1,
        staffId: staffId
      },
      success: (res: any) => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          const users = res.result.data.users
          if (users && users.length > 0) {
            const staff = users[0]
            const voiceSettings = staff.voiceSettings || {}

            // 格式化员工数据
            const formattedStaff = {
              ...staff,
              voiceType: voiceSettings.voiceType || 'normal',
              introduction: voiceSettings.introduction || '暂无自我介绍',
              audioUrl: voiceSettings.audioUrl
            }

            this.setData({
              staff: formattedStaff,
              loading: false
            })
          } else {
            wx.showToast({
              title: '员工信息不存在',
              icon: 'none'
            })
            this.setData({ loading: false })
          }
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载员工详情失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 播放音频介绍
  playAudioIntro() {
    const audioUrl = this.data.staff?.audioUrl

    if (!audioUrl) {
      wx.showToast({
        title: '暂无音频介绍',
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

  // 创建订单
  createOrder() {
    const staff = this.data.staff
    if (staff) {
      wx.navigateTo({
        url: `/pages/boss/create-order/index?staffId=${staff._openid}&staffName=${staff.nickname}`
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})