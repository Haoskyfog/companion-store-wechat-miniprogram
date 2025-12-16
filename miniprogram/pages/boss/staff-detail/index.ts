// 老板端 - 员工详情页
Page({
  data: {
    staff: null as any,
    loading: true,
    // 音频播放相关
    audioContext: null as any,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    audioLoading: false
  },

  onLoad(options: any) {
    const staffId = options.staffId

    if (!staffId) {
      wx.showToast({
        title: '缺少员工信息',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 直接通过staffId加载员工详情，确保每次进入都能获取到最新数据
    this.loadStaffDetail(staffId)
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
      success: async (res: any) => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          const users = res.result.data.users
          if (users && users.length > 0) {
            const staff = users[0]
            const voiceSettings = staff.voiceSettings || {}

            // 转换头像URL（cloud:// → 临时URL）
            let avatar = staff.avatar
            if (avatar && avatar.startsWith('cloud://')) {
              try {
                const tempRes = await wx.cloud.getTempFileURL({
                  fileList: [avatar]
                })
                if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
                  avatar = tempRes.fileList[0].tempFileURL
                }
              } catch (err) {
                console.error('转换头像URL失败:', err)
              }
            }

            // 转换自介图URL
            let introImage = voiceSettings.introImage
            if (introImage && introImage.startsWith('cloud://')) {
              try {
                const tempRes = await wx.cloud.getTempFileURL({
                  fileList: [introImage]
                })
                if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
                  introImage = tempRes.fileList[0].tempFileURL
                }
              } catch (err) {
                console.error('转换自介图URL失败:', err)
              }
            }

            // 格式化员工数据
            const formattedStaff = {
              ...staff,
              avatar: avatar,
              voiceType: voiceSettings.voiceType || '青年',
              game: voiceSettings.game || '王者荣耀',
              lane: voiceSettings.lane || '',
              introduction: voiceSettings.introduction || '暂无自我介绍',
              introImage: introImage,
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

  // 播放/暂停音频介绍
  playAudioIntro() {
    const audioUrl = this.data.staff?.audioUrl

    if (!audioUrl) {
      wx.showToast({
        title: '暂无音频介绍',
        icon: 'none'
      })
      return
    }

    // 如果已有音频上下文且正在播放，则暂停
    if (this.data.audioContext && this.data.isPlaying) {
      this.pauseAudio()
      return
    }

    // 如果已有音频上下文但暂停了，则继续播放
    if (this.data.audioContext && !this.data.isPlaying) {
      this.resumeAudio()
      return
    }

    // 否则开始新的播放
    this.startNewAudio(audioUrl)
  },

  // 开始新的音频播放
  startNewAudio(audioUrl: string) {
    this.setData({ audioLoading: true })

    // 判断是否是云文件ID（cloud://开头）
    if (audioUrl.startsWith('cloud://')) {
      // 云文件ID需要先转换为临时URL
      wx.cloud.getTempFileURL({
        fileList: [audioUrl],
        success: (res) => {
          if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
            const tempUrl = res.fileList[0].tempFileURL
            this.createAudioContext(tempUrl)
          } else {
            this.setData({ audioLoading: false })
            wx.showToast({
              title: '音频获取失败',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          this.setData({ audioLoading: false })
          console.error('获取音频临时URL失败:', err)
          wx.showToast({
            title: '音频获取失败',
            icon: 'none'
          })
        }
      })
    } else {
      // 直接是HTTP/HTTPS URL，可以直接使用
      this.createAudioContext(audioUrl)
    }
  },

  // 创建音频上下文
  createAudioContext(url: string) {
    wx.downloadFile({
      url: url,
      success: (res) => {
        this.setData({ audioLoading: false })

        if (res.statusCode === 200 && res.tempFilePath) {
          const audioContext = wx.createInnerAudioContext()
          audioContext.src = res.tempFilePath
          audioContext.autoplay = true

          // 设置音频事件监听
          audioContext.onPlay(() => {
            this.setData({
              isPlaying: true,
              duration: audioContext.duration || 0
            })
          })

          audioContext.onPause(() => {
            this.setData({ isPlaying: false })
          })

          audioContext.onStop(() => {
            this.setData({
              isPlaying: false,
              currentTime: 0,
              progress: 0
            })
          })

          audioContext.onEnded(() => {
            this.setData({
              isPlaying: false,
              currentTime: 0,
              progress: 0
            })
            audioContext.destroy()
            this.setData({ audioContext: null })
          })

          audioContext.onTimeUpdate(() => {
            const currentTime = audioContext.currentTime || 0
            const duration = audioContext.duration || 0
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0

            this.setData({
              currentTime,
              duration,
              progress
            })
          })

          audioContext.onError((err) => {
            console.error('音频播放失败:', err)
            wx.showToast({
              title: '播放失败',
              icon: 'none'
            })
            audioContext.destroy()
            this.setData({
              audioContext: null,
              isPlaying: false
            })
          })

          this.setData({ audioContext })
        } else {
          wx.showToast({
            title: '音频加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        this.setData({ audioLoading: false })
        console.error('下载音频失败:', err)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      }
    })
  },

  // 暂停音频
  pauseAudio() {
    if (this.data.audioContext) {
      this.data.audioContext.pause()
    }
  },

  // 继续播放音频
  resumeAudio() {
    if (this.data.audioContext) {
      this.data.audioContext.play()
    }
  },

  // 停止音频
  stopAudio() {
    if (this.data.audioContext) {
      this.data.audioContext.stop()
      this.data.audioContext.destroy()
      this.setData({
        audioContext: null,
        isPlaying: false,
        currentTime: 0,
        progress: 0
      })
    }
  },

  // 进度条拖拽
  onProgressChange(e: any) {
    if (!this.data.audioContext || this.data.duration === 0) return

    const progress = e.detail.value
    const seekTime = (progress / 100) * this.data.duration

    this.data.audioContext.seek(seekTime)
    this.setData({
      currentTime: seekTime,
      progress
    })
  },

  // 格式化时间显示
  formatTimeDisplay(seconds: number) {
    if (!seconds || seconds === 0) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  // 预览自我介绍图片
  previewIntroImage() {
    const introImage = this.data.staff?.introImage
    if (introImage) {
      wx.previewImage({
        current: introImage,
        urls: [introImage]
      })
    }
  },

  // 查看订单
  viewOrders() {
    const staff = this.data.staff
    if (staff) {
      wx.navigateTo({
        url: `/pages/boss/orders/index?staffId=${staff._openid}&staffName=${staff.nickname}`
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})