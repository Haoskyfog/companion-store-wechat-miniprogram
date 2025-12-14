// 员工端 - 我的
const pagePath = 'pages/staff/profile/index';

Page({
  data: {
    userInfo: null as any,
    stats: {
      totalOrders: 0,
      totalDuration: 0,
      rating: 0
    },
    voiceSettings: {
      voiceType: 'normal', // normal, cute, cool, mature
      audioUrl: '', // 录制的音频文件URL
      introduction: '' // 自我介绍文本
    },
    quickActions: [
      { id: 1, icon: '📝', label: '创建订单', bgColor: '#ddd6fe', action: 'createOrder' },
      { id: 2, icon: '📋', label: '提交报备', bgColor: '#dbeafe', action: 'submitReport' },
      { id: 3, icon: '🏆', label: '排行榜', bgColor: '#fed7aa', action: 'ranking' },
      { id: 4, icon: '📊', label: '数据统计', bgColor: '#bbf7d0', action: 'stats' }
    ],
    profileMenu: [
      { id: 1, icon: '🎮', label: '主玩游戏 / 分路标签', action: 'games' },
      { id: 2, icon: '🖼️', label: '上传自介图', action: 'introImage' },
      { id: 3, icon: '🎙️', label: '录制语音介绍', action: 'voiceIntro' },
      { id: 4, icon: '🎤', label: '音色选择', action: 'voiceSettings' },
      { id: 5, icon: '📝', label: '编辑自我介绍', action: 'editIntro' },
      { id: 6, icon: '🎵', label: '添加音频', action: 'addAudio' }
    ],
    otherMenu: [
      {
        id: 1,
        icon: '📋',
        title: '我的订单',
        desc: '查看订单历史',
        bgColor: '#ddd6fe',
        action: 'myOrders'
      },
      {
        id: 2,
        icon: '📄',
        title: '报备记录',
        desc: '查看报备历史',
        bgColor: '#dbeafe',
        action: 'reports'
      },
      {
        id: 3,
        icon: '👤',
        title: '编辑资料',
        desc: '修改头像昵称',
        bgColor: '#fed7aa',
        action: 'editProfile'
      },
      {
        id: 4,
        icon: '⚙️',
        title: '设置',
        desc: '应用设置',
        bgColor: '#bbf7d0',
        action: 'settings'
      }
    ],
    loading: true
  },

  onLoad() {
    this.loadUserData()
  },

  onShow() {
    // 检查用户角色
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

    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.syncRole && tabBar.syncRole('Staff');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }

    // 注册用户资料更新回调
    const appInstance = getApp<IAppOption>()
    appInstance.setUserProfileUpdateCallback(this.onUserProfileUpdated.bind(this))
  },

  onHide() {
    // 清除用户资料更新回调
    const app = getApp<IAppOption>()
    app.clearUserProfileUpdateCallback()
  },

  // 用户资料更新事件处理
  onUserProfileUpdated(updatedUserInfo: any) {
    // 更新本地用户数据
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...updatedUserInfo
      }
    })
  },

  // 加载用户数据
  loadUserData() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (userRes: any) => {
        if (userRes.result && userRes.result.success) {
          this.setData({
            userInfo: userRes.result.data,
            loading: false
          })
          // 加载统计数据
          this.loadStats()
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载用户信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    })
  },

  // 加载统计数据
  loadStats() {
    wx.cloud.callFunction({
      name: 'getStatistics',
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const stats = res.result.data
          this.setData({
            stats: {
              totalOrders: stats.orders?.total || 0,
              totalDuration: stats.orders?.totalDuration || 0,
              rating: 95 // 模拟好评率
            }
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载统计失败:', err)
      }
    })
  },

  // 快捷操作点击
  onQuickAction(e: any) {
    const action = e.currentTarget.dataset.action
    this.handleAction(action)
  },

  // 个人资料菜单点击
  onProfileMenu(e: any) {
    const action = e.currentTarget.dataset.action
    this.handleAction(action)
  },

  // 其他菜单点击
  onOtherMenu(e: any) {
    const action = e.currentTarget.dataset.action
    this.handleAction(action)
  },

  // 处理各种操作
  handleAction(action: string) {
    switch (action) {
      case 'createOrder':
        wx.navigateTo({ url: '/pages/staff/create-order/index' })
        break
      case 'submitReport':
        wx.navigateTo({ url: '/pages/staff/report/index' })
        break
      case 'ranking':
        wx.switchTab({ url: '/pages/staff/ranking/index' })
        break
      case 'stats':
        wx.navigateTo({ url: '/pages/staff/stats/index' })
        break
      case 'myOrders':
        wx.navigateTo({ url: '/pages/staff/orders/index' })
        break
      case 'reports':
        wx.navigateTo({ url: '/pages/staff/reports/index' })
        break
      case 'editProfile':
        wx.navigateTo({ url: '/pages/profile/edit/index' })
        break
      case 'voiceSettings':
        this.showVoiceSettings()
        break
      case 'editIntro':
        this.showIntroEditor()
        break
      case 'addAudio':
        this.showAudioRecorder()
        break
      case 'settings':
        this.showSettings()
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  // 音色选择
  showVoiceSettings() {
    const voiceTypes = [
      { key: 'normal', label: '普通音色', emoji: '🎤' },
      { key: 'cute', label: '可爱音色', emoji: '🎀' },
      { key: 'cool', label: '酷炫音色', emoji: '😎' },
      { key: 'mature', label: '成熟音色', emoji: '👩' }
    ]

    wx.showActionSheet({
      itemList: voiceTypes.map(v => `${v.emoji} ${v.label}`),
      success: (res) => {
        const selectedVoice = voiceTypes[res.tapIndex]
        this.setData({
          'voiceSettings.voiceType': selectedVoice.key
        })

        // 保存到云端
        this.saveVoiceSettings()

        wx.showToast({
          title: `已选择${selectedVoice.label}`,
          icon: 'success'
        })
      }
    })
  },

  // 自我介绍编辑
  showIntroEditor() {
    wx.showModal({
      title: '编辑自我介绍',
      editable: true,
      placeholderText: '请输入您的自我介绍...',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            'voiceSettings.introduction': res.content
          })

          // 保存到云端
          this.saveVoiceSettings()

          wx.showToast({
            title: '自我介绍已保存',
            icon: 'success'
          })
        }
      }
    })
  },

  // 音频录制
  showAudioRecorder() {
    wx.showActionSheet({
      itemList: ['录制新音频', '选择本地音频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.startAudioRecording()
        } else {
          this.selectLocalAudio()
        }
      }
    })
  },

  // 开始录音
  startAudioRecording() {
    const recorderManager = wx.getRecorderManager()

    recorderManager.onStart(() => {
      wx.showToast({ title: '开始录音', icon: 'none' })
    })

    recorderManager.onStop((res) => {
      console.log('录音完成:', res)
      if (res.tempFilePath) {
        this.uploadAudioFile(res.tempFilePath)
      }
    })

    recorderManager.onError((err) => {
      console.error('录音失败:', err)
      wx.showToast({ title: '录音失败', icon: 'none' })
    })

    // 开始录音
    recorderManager.start({
      duration: 60000, // 最长录音时间60秒
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'mp3'
    })

    // 10秒后自动停止
    setTimeout(() => {
      recorderManager.stop()
    }, 10000)
  },

  // 选择本地音频
  selectLocalAudio() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'm4a', 'wav'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles[0]) {
          this.uploadAudioFile(res.tempFiles[0].path)
        }
      }
    })
  },

  // 上传音频文件
  uploadAudioFile(filePath: string) {
    wx.showLoading({ title: '上传中...' })

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`

    wx.cloud.uploadFile({
      cloudPath: `voices/${fileName}`,
      filePath: filePath,
      success: (res) => {
        wx.hideLoading()
        console.log('音频上传成功:', res.fileID)

        this.setData({
          'voiceSettings.audioUrl': res.fileID
        })

        // 保存到云端
        this.saveVoiceSettings()

        wx.showToast({
          title: '音频上传成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('音频上传失败:', err)
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  // 保存语音设置到云端
  saveVoiceSettings() {
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        voiceSettings: this.data.voiceSettings
      },
      success: (res) => {
        if (res.result && res.result.success) {
          console.log('语音设置保存成功')
        }
      },
      fail: (err) => {
        console.error('语音设置保存失败:', err)
      }
    })
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  }
})
