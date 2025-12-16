// 老板端 - 我的
const pagePath = 'pages/boss/profile/index';

Page({
  // 回调函数引用，用于正确注销
  userProfileUpdateCallback: null as ((userInfo: any) => void) | null,

  data: {
    userInfo: null as any,
    walletInfo: {
      balance: 0
    },
    totalConsumption: 0,
    storyContent: '',
    currentLevelName: '',
    myStaffs: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar: string;
    }>,
    menuList: [
      {
        id: 1,
        icon: '📋',
        title: '我的订单',
        desc: '查看订单记录',
        bgColor: '#ddd6fe',
        action: 'viewOrders'
      },
      {
        id: 3,
        icon: '🔄',
        title: '申请更换直属',
        desc: '提交更换申请',
        bgColor: '#dbeafe',
        action: 'changeStaff'
      },
      {
        id: 4,
        icon: '👤',
        title: '编辑资料',
        desc: '修改头像昵称',
        bgColor: '#fed7aa',
        action: 'editProfile'
      },
      {
        id: 5,
        icon: '💬',
        title: '客诉反馈',
        desc: '提交问题与建议',
        bgColor: '#bbf7d0',
        action: 'feedback'
      }
    ],
    loading: true
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);

    // 注册用户资料更新回调
    const app = getApp<IAppOption>()
    if (!this.userProfileUpdateCallback) {
      this.userProfileUpdateCallback = this.onUserProfileUpdated.bind(this)
    }
    app.registerUserProfileUpdateCallback(this.userProfileUpdateCallback)
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
    console.log('收到用户资料更新:', updatedUserInfo) // 添加调试信息
    // 更新本地用户数据
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...updatedUserInfo
      }
    })
  },

  // 加载用户信息和直属员工
  loadUserInfo() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            userInfo: res.result.data,
            loading: false
          })
          // 加载钱包和消费信息
          this.loadWalletInfo()
          this.loadConsumptionInfo()
          // 加载直属员工列表
          this.loadMyStaffs()
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('获取用户信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    })
  },


  // 加载钱包信息
  loadWalletInfo() {
    // 获取用户钱包余额
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        if (res.result && res.result.success) {
          const userData = res.result.data
          const walletBalance = userData.walletBalance || 0
          this.setData({
            'walletInfo.balance': walletBalance
          })
          // 使用钱包余额来计算等级
          this.calculateCurrentLevel(walletBalance)
        }
      },
      fail: (err) => {
        console.error('获取钱包余额失败:', err)
        this.setData({
          'walletInfo.balance': 0
        })
        this.calculateCurrentLevel(0)
      }
    })
  },

  // 加载消费信息
  loadConsumptionInfo() {
    wx.cloud.callFunction({
      name: 'getTotalRecharge',
      success: (res: any) => {
        if (res.result && res.result.success) {
          const totalConsumption = res.result.data.totalConsumption
          this.setData({
            totalConsumption: totalConsumption
          })
          this.calculateCurrentLevel(totalConsumption)
        }
      },
      fail: (err) => {
        console.error('获取消费金额失败:', err)
        this.setData({
          totalConsumption: 0
        })
        this.calculateCurrentLevel(0)
      }
    })
  },

  // 计算当前等级和故事内容
  calculateCurrentLevel(totalAmount: number) {
    const levels = [
      { name: 'VIP1', amount: 0, story: '🌹 当第一缕阳光洒进花园，你踏进了这片诗意的领地。玫瑰们为你绽放，空气中弥漫着清新的花香。从这一刻起，你我之间的故事正式拉开序幕。' },
      { name: 'VIP2', amount: 666, story: '🎼 琴键在指尖轻舞，你我共同谱写了第一乐章。每一个音符都承载着相遇的喜悦，每一个和弦都诉说着未来的期待。愿我们的旋律永不休止。' },
      { name: 'VIP3', amount: 1888, story: '🎵 夜空中繁星闪烁，我为你谱写了这首咏叹调。每一个音符都蕴含着对你的敬意，每一句歌词都铭刻着你的名字。愿这首歌成为我们永恒的见证。' },
      { name: 'VIP4', amount: 3500, story: '🌙 月光如水般温柔，诗人静坐在湖边，沉思良久。你的身影倒映在水中，你的笑容照亮了整个夜空。此刻，我为你戴上这顶桂冠，愿你的光辉永照sonnet。' },
      { name: 'VIP5', amount: 8888, story: '🎨 画笔在画布上轻柔滑动，每一笔都试图捕捉你的灵魂。你的笑容如春花般绽放，你的眼神如星辰般璀璨。这些速写将成为我们共同的记忆。' },
      { name: 'VIP6', amount: 18888, story: '⭐ 我攀登上最高的山巅，只为摘下夜空中最亮的那颗星。从今以后，这颗星将以你的名字命名，永远照亮sonnet的长河。我们的契约，将伴随这永恒的光芒。' },
      { name: 'VIP7', amount: 52000, story: '🎭 时间如白驹过隙，但艺术永存。这一刻的辉煌，这一刻的美丽，将被永远定格在画卷之中。我们的故事，成为永恒的艺术品。' },
      { name: 'VIP8', amount: 88888, story: '🌸 推开这扇隐秘的花园之门，外界的喧嚣被隔绝在外。今夜不去谈论诗句，只有我和你。让我们在花海中徜徉，在月光下低语。' },
      { name: 'VIP9', amount: 138888, story: '💫 岁月的年轮缓缓转动，每一圈都沉淀着我们的回忆。金色的光辉照耀着这些珍贵的时光，让我们的情谊如黄金般永恒闪耀。' },
      { name: 'VIP10', amount: 288888, story: '👑 万众瞩目之下，你踏上了王座。你是缪斯女神的化身，是诗人的信仰源泉。此刻，为你加冕，让全世界见证你的荣耀。' },
      { name: 'VIP11', amount: 500000, story: '🌟 当故事变成神话，你我皆是传说。每一个周年，每一个生日，Sonnet都会为你奏响回响。我们的爱情，成为永恒的神话。' }
    ]

    let currentLevelIndex = 0
    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalAmount >= levels[i].amount) {
        currentLevelIndex = i
        break
      }
    }

    const currentLevel = levels[currentLevelIndex]
    this.setData({
      currentLevelName: currentLevel.name,
      storyContent: currentLevel.story
    })
  },

  // 加载直属员工列表
  loadMyStaffs() {
    if (!this.data.userInfo) return

    wx.cloud.database().collection('bindings')
      .where({
        bossId: this.data.userInfo._openid,
        status: 'active'
      })
      .get()
      .then((bindingRes: any) => {
        wx.hideLoading()
        if (bindingRes.data && bindingRes.data.length > 0) {
          // 获取员工信息
          const staffPromises = bindingRes.data.map((binding: any) =>
            wx.cloud.database().collection('users')
              .where({ _openid: binding.staffId })
              .get()
          )

          Promise.all(staffPromises).then((staffResults: any[]) => {
            const staffs = staffResults
              .filter(result => result.data && result.data.length > 0)
              .map((result) => ({
                _openid: result.data[0]._openid,
                nickname: result.data[0].nickname || '未设置昵称',
                userId: result.data[0].userId || '',
                avatar: result.data[0].avatar || ''
              }))

            // 处理头像URL转换
            this.processStaffAvatars(staffs).then(processedStaffs => {
              this.setData({ myStaffs: processedStaffs })
            }).catch(err => {
              console.error('处理员工头像失败:', err)
              this.setData({ myStaffs: staffs }) // 出错时使用原始数据
          })
          })
        } else {
          this.setData({ myStaffs: [] })
        }
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('加载员工列表失败:', err)
        this.setData({ myStaffs: [] })
      })
  },

  // 处理员工头像URL
  async processStaffAvatars(staffs: any[]) {
    const processedStaffs = []

    // 收集所有需要转换的头像URL
    const avatarUrls = []
    for (const staff of staffs) {
      if (staff.avatar && staff.avatar.startsWith('cloud://')) {
        avatarUrls.push(staff.avatar)
      }
    }

    // 去重
    const uniqueUrls = [...new Set(avatarUrls)]

    // 批量转换头像URL
    let tempUrlMap: { [key: string]: string } = {}
    if (uniqueUrls.length > 0) {
      try {
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: uniqueUrls
        })
        if (tempRes.fileList) {
          tempRes.fileList.forEach(item => {
            // 只接受 status === 0 且有 tempFileURL 的结果
            if (item.status === 0 && item.tempFileURL) {
            tempUrlMap[item.fileID] = item.tempFileURL
            } else {
              console.warn('头像转换失败:', item.fileID, 'status:', item.status)
            }
          })
        }
      } catch (err) {
        console.error('转换员工头像URL失败:', err)
      }
    }

    // 处理每个员工
    for (const staff of staffs) {
      const processedStaff = { ...staff }

      if (staff.avatar && staff.avatar.trim() !== '') {
        if (staff.avatar.startsWith('cloud://')) {
          // 只使用成功转换的URL，否则设为 null
          processedStaff.avatar = tempUrlMap[staff.avatar] || null
        }
        // 其他格式（包括https://）直接使用
      } else {
        processedStaff.avatar = null
      }

      processedStaffs.push(processedStaff)
    }

    return processedStaffs
  },

  // VIP会员点击
  onVipTap() {
    wx.navigateTo({ url: '/pages/boss/vip/index' })
  },

  // 菜单项点击
  onMenuTap(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'viewOrders':
        wx.navigateTo({ url: '/pages/boss/orders/index' })
        break
      case 'changeStaff':
        this.showChangeStaffDialog()
        break
      case 'editProfile':
        wx.navigateTo({ url: '/pages/profile/edit/index' })
        break
      case 'feedback':
        wx.showToast({ title: '功能开发中', icon: 'none' })
        break
      case 'help':
        wx.showToast({ title: '功能开发中', icon: 'none' })
        break
    }
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' })
    this.loadUserInfo()
  },

  // 显示更换直属员工对话框
  showChangeStaffDialog() {
    if (this.data.myStaffs.length === 0) {
      wx.showToast({ title: '暂无直属员工', icon: 'none' })
      return
    }

    const staffList = this.data.myStaffs.map(staff => staff.nickname || '未设置昵称').join('\n')
    wx.showModal({
      title: '申请更换直属',
      content: `当前直属员工：\n${staffList}\n\n请选择要更换的员工和新员工`,
      showCancel: true,
      confirmText: '申请更换',
      success: (res) => {
        if (res.confirm) {
          // 跳转到更换申请页面
          wx.navigateTo({ url: '/pages/boss/change-staff/index' })
        }
      }
    })
  }
})
