// 员工端 - 我的
const pagePath = 'pages/staff/home/index';

Page({
  // 回调函数引用，用于正确注销
  userProfileUpdateCallback: null as ((userInfo: any) => void) | null,

  data: {
    userInfo: null as any,
    stats: {
      totalOrders: 0,
      approvedReports: 0,
      personalRevenue: 0,
      subordinateRevenue: 0
    },
    myBosses: [] as Array<any>,
    voiceSettings: {
      voiceType: '青年', // 青年，青叔，温青，少女，御姐，少御，萝莉
      game: '王者荣耀', // 主玩游戏
      lane: '', // 分路标签：对抗路，中路，发育路，打野，游走
      introduction: '', // 自我介绍文本
      introImage: '', // 自我介绍图片URL
      audioUrl: '' // 语音介绍音频URL
    },
    quickActions: [
      { id: 1, icon: '📝', label: '创建订单', bgColor: '#ddd6fe', action: 'createOrder' },
      { id: 2, icon: '📋', label: '提交报备', bgColor: '#dbeafe', action: 'submitReport' },
      { id: 3, icon: '🏆', label: '排行榜', bgColor: '#fed7aa', action: 'ranking' },
      { id: 4, icon: '📊', label: '数据统计', bgColor: '#bbf7d0', action: 'stats' }
    ],
    profileMenu: [
      { id: 1, icon: '🎮', label: '主玩游戏', action: 'selectGame' },
      { id: 2, icon: '🛤️', label: '分路标签', action: 'games' },
      { id: 3, icon: '🖼️', label: '上传自介图', action: 'introImage' },
      { id: 4, icon: '🎤', label: '音色选择', action: 'voiceSettings' },
      { id: 5, icon: '🎵', label: '上传语音介绍', action: 'uploadAudio' },
      { id: 6, icon: '📝', label: '编辑自我介绍', action: 'editIntro' }
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
      }
      // 删除了设置功能
    ],
    loading: true,
    developerInfo: null as any,
    showTipPopup: false,
    tipQrcodeUrl: 'cloud://cloud1-7g62s1bob33a0a2c.636c-cloud1-7g62s1bob33a0a2c-1389576972/9ea0f021f156714ee25896664e094ca9.jpg'
  },

  onLoad() {
    this.loadUserData()
    this.loadDeveloperInfo()
  },

  // 加载开发者信息
  loadDeveloperInfo() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: { staffId: 'o1J6A1z69dB9Cp5QcY5zI-ZzW1Qw' },
      success: (res: any) => {
        if (res.result && res.result.success && res.result.data.users && res.result.data.users.length > 0) {
          this.setData({ developerInfo: res.result.data.users[0] })
        }
      }
    })
  },

  // 显示打赏弹窗
  showTipQrcode() {
    this.setData({ showTipPopup: true })
  },

  // 关闭打赏弹窗
  closeTipPopup() {
    this.setData({ showTipPopup: false })
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      // 确保TabBar显示正确的角色配置
      tabBar.syncRole && tabBar.syncRole('Staff');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }

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

    // 注册用户资料更新回调
    const appInstance = getApp<IAppOption>()
    if (!this.userProfileUpdateCallback) {
      this.userProfileUpdateCallback = this.onUserProfileUpdated.bind(this)
    }
    appInstance.registerUserProfileUpdateCallback(this.userProfileUpdateCallback)

    // 每次显示时刷新统计数据（包括个人流水），但不显示loading
    // 只在用户信息已加载完成时刷新统计数据
    if (this.data.userInfo && !this.data.loading) {
      this.loadStats(false)
    }
  },

  onHide() {
    // 注销用户资料更新回调
    const app = getApp<IAppOption>()
    if (this.userProfileUpdateCallback) {
      app.unregisterUserProfileUpdateCallback(this.userProfileUpdateCallback)
    }
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
        wx.hideLoading() // 确保隐藏loading
        if (userRes.result && userRes.result.success) {
          const userInfo = userRes.result.data
          const voiceSettings = userInfo.voiceSettings || {}

          // 更新voiceSettings，确保包含所有字段
          this.setData({
            userInfo: userInfo,
            'voiceSettings.voiceType': voiceSettings.voiceType || '青年',
            'voiceSettings.game': voiceSettings.game || '王者荣耀',
            'voiceSettings.lane': voiceSettings.lane || '',
            'voiceSettings.introduction': voiceSettings.introduction || '',
            'voiceSettings.introImage': voiceSettings.introImage || '',
            'voiceSettings.audioUrl': voiceSettings.audioUrl || '',
            loading: false
          })
          // 加载统计数据（不显示loading，因为已经在loadUserData中显示了）
          this.loadStats(false)
          // 加载我的老板列表
          this.loadMyBosses()
        } else {
          console.error('获取用户信息失败:', userRes.result)
          wx.showToast({ title: '加载失败', icon: 'none' })
          this.setData({ loading: false })
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
  loadStats(showLoading = false) {
    if (showLoading) {
      wx.showLoading({ title: '加载中...' })
    }

    wx.cloud.callFunction({
      name: 'getStatistics',
      success: (res: any) => {
        if (showLoading) {
          wx.hideLoading()
        }
        if (res.result && res.result.success) {
          const stats = res.result.data
          console.log('员工个人资料 - 收到的统计数据:', stats)
          console.log('个人流水 (totalRevenue):', stats.reports?.totalRevenue, '类型:', typeof stats.reports?.totalRevenue)

          const personalRevenue = Number(stats.reports?.totalRevenue) || 0
          const subordinateRevenue = Number(stats.subordinateRevenue) || 0
          const approvedReports = Number(stats.reports?.approved) || 0

          this.setData({
            stats: {
              totalOrders: stats.orders?.total || 0,
              approvedReports: approvedReports,
              personalRevenue: personalRevenue,
              subordinateRevenue: subordinateRevenue
            }
          })

          console.log('设置后的个人流水:', this.data.stats.personalRevenue)
          console.log('设置后的直属流水:', this.data.stats.subordinateRevenue)
        } else {
          console.error('获取统计数据失败:', res.result)
          // 即使失败也设置默认值，避免显示异常
          this.setData({
            stats: {
              totalOrders: this.data.stats.totalOrders || 0,
              approvedReports: this.data.stats.approvedReports || 0,
              personalRevenue: this.data.stats.personalRevenue || 0,
              subordinateRevenue: this.data.stats.subordinateRevenue || 0
            }
          })
        }
      },
      fail: (err: any) => {
        if (showLoading) {
          wx.hideLoading()
        }
        console.error('加载统计失败:', err)
        // 即使失败也保持当前数据，避免清空
      }
    })
  },

  // 加载我的老板列表
  loadMyBosses() {
    wx.cloud.callFunction({
      name: 'manageBindings',
      data: { action: 'getMyBosses' },
      success: (res: any) => {
        if (res.result?.success) {
          this.setData({ myBosses: res.result.data || [] })
        }
      }
    })
  },

  // 跳转到我的老板页面
  goToMyBosses() {
    wx.navigateTo({ url: '/pages/staff/my-bosses/index' })
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
        wx.navigateTo({ url: '/pages/staff/ranking/index' })
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
      case 'selectGame':
        this.showMainGameSelector()
        break
      case 'games':
        this.showGameSelector()
        break
      case 'voiceSettings':
        this.showVoiceSettings()
        break
      case 'introImage':
        this.uploadIntroImage()
        break
      case 'uploadAudio':
        this.uploadAudioFile()
        break
      case 'editIntro':
        this.showIntroEditor()
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  // 主玩游戏选择
  showMainGameSelector() {
    const games = [
      { key: '王者荣耀', label: '王者荣耀', emoji: '👑' },
      { key: '手瓦', label: '手瓦', emoji: '🎮' },
      { key: '端瓦', label: '端瓦', emoji: '💻' },
      { key: '手洲', label: '手洲', emoji: '📱' },
      { key: '端洲', label: '端洲', emoji: '🖥️' }
    ]

    const itemList = games.map(g => `${g.emoji} ${g.label}`)

    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedGame = games[res.tapIndex]
        this.setData({
          'voiceSettings.game': selectedGame.key
        })
        this.saveVoiceSettings()
        wx.showToast({
          title: `已选择${selectedGame.label}`,
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({ title: '操作取消', icon: 'none' })
      }
    })
  },

  // 分路标签选择
  showGameSelector() {
    const lanes = [
      { key: '对抗路', label: '对抗路', emoji: '⚔️' },
      { key: '中路', label: '中路', emoji: '🧙‍♂️' },
      { key: '发育路', label: '发育路', emoji: '🏹' },
      { key: '打野', label: '打野', emoji: '🐺' },
      { key: '游走', label: '游走', emoji: '🏃‍♂️' }
    ]

    const itemList = lanes.map(l => `${l.emoji} ${l.label}`)

    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedLane = lanes[res.tapIndex]
        this.setData({
          'voiceSettings.lane': selectedLane.key
        })
        this.saveVoiceSettings()
        wx.showToast({
          title: `已选择${selectedLane.label}`,
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({ title: '操作取消', icon: 'none' })
      }
    })
  },

  // 音色选择
  showVoiceSettings() {
    const voiceTypes = [
      { key: '青年', label: '青年' },
      { key: '青叔', label: '青叔' },
      { key: '温青', label: '温青' },
      { key: '少女', label: '少女' },
      { key: '御姐', label: '御姐' },
      { key: '少御', label: '少御' }
    ]

    const itemList = voiceTypes.map(v => v.label)

    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        console.log('音色选择结果:', res)
        const selectedVoice = voiceTypes[res.tapIndex]
        console.log('选择的音色:', selectedVoice)

        this.setData({
          'voiceSettings.voiceType': selectedVoice.key
        })

        // 保存到云端
        this.saveVoiceSettings()

        wx.showToast({
          title: `已选择${selectedVoice.label}`,
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('音色选择失败:', err)
        wx.showToast({
          title: '操作取消',
          icon: 'none'
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

  // 上传自我介绍图片
  uploadIntroImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImageToCloud(tempFilePath)
      }
    })
  },

  // 上传音频文件
  uploadAudioFile() {
    wx.showActionSheet({
      itemList: ['选择本地音频', '录制新音频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 选择本地音频
          wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['mp3', 'm4a', 'wav', 'aac'],
            success: (fileRes) => {
              if (fileRes.tempFiles && fileRes.tempFiles[0]) {
                this.uploadAudioToCloud(fileRes.tempFiles[0].path)
              }
            },
            fail: (err) => {
              console.error('选择音频失败:', err)
              wx.showToast({ title: '选择音频失败', icon: 'none' })
            }
          })
        } else if (res.tapIndex === 1) {
          // 录制新音频
          this.startAudioRecording()
        }
      }
    })
  },

  // 开始录音
  startAudioRecording() {
    const recorderManager = wx.getRecorderManager()
    let recording = false

    recorderManager.onStart(() => {
      recording = true
      wx.showToast({
        title: '开始录音，点击确定停止',
        icon: 'none',
        duration: 2000
      })
    })

    recorderManager.onStop((res) => {
      recording = false
      console.log('录音完成:', res)
      if (res.tempFilePath) {
        this.uploadAudioToCloud(res.tempFilePath)
      } else {
        wx.showToast({ title: '录音失败', icon: 'none' })
      }
    })

    recorderManager.onError((err) => {
      recording = false
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

    // 显示停止录音提示
    wx.showModal({
      title: '正在录音',
      content: '最长可录制60秒，点击确定停止录音',
      showCancel: true,
      cancelText: '取消',
      confirmText: '停止录音',
      success: (modalRes) => {
        if (recording) {
          recorderManager.stop()
        }
      }
    })
  },

  // 上传音频到云存储
  uploadAudioToCloud(filePath: string) {
    wx.showLoading({ title: '上传中...' })

    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`

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

  // 上传图片到云存储
  uploadImageToCloud(filePath: string) {
    wx.showLoading({ title: '上传中...' })

    const fileName = `intro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`

    wx.cloud.uploadFile({
      cloudPath: `intro_images/${fileName}`,
      filePath: filePath,
      success: (res) => {
        wx.hideLoading()
        console.log('图片上传成功:', res.fileID)

        this.setData({
          'voiceSettings.introImage': res.fileID
        })

        // 保存到云端
        this.saveVoiceSettings()

        wx.showToast({
          title: '图片上传成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('图片上传失败:', err)
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

  // 刷新数据
  onRefresh() {
    // loadUserData 内部会调用 loadStats，所以只需要调用 loadUserData
    this.loadUserData()
  }
})
