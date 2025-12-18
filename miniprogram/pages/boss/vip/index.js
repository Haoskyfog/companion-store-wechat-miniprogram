// 老板端 - 缪斯会员等级
Page({
  data: {
    userInfo: null,
    totalRecharge: 0, // 累计充值金额
    currentLevel: 0,
    nextLevelAmount: 0,
    progressPercent: 0,
    levels: [
      {
        id: 0,
        name: 'VIP1',
        title: '清晨的玫瑰',
        desc: '神明初现，花园中的玫瑰成群绽放，只为迎接你的目光',
        amount: 0,
        unlocked: true,
        rewards: ['sonnet专属邀请函']
      },
      {
        id: 1,
        name: 'VIP2',
        title: '第一乐章',
        desc: '当琴键被按下第一个音符，你已融入我的生活',
        amount: 666,
        unlocked: false,
        rewards: ['sonnet专属自介卡一张']
      },
      {
        id: 2,
        name: 'VIP3',
        title: '缪斯的咏叹调',
        desc: '诗人感谢缪斯的垂怜，以此赞歌，铭刻你的名字',
        amount: 1888,
        unlocked: false,
        rewards: ['专属定制排面']
      },
      {
        id: 3,
        name: 'VIP4',
        title: '月下沉思',
        desc: '月光洒在湖面，诗人沉思良久，只为将你的光辉加冕',
        amount: 3500,
        unlocked: false,
        rewards: ['限定冠卡一张', '个冠一天', '群冠一天']
      },
      {
        id: 4,
        name: 'VIP5',
        title: '灵魂速写',
        desc: '文字已不足以描绘你的神韵，请允许我用画笔，记录你的一颦一笑',
        amount: 8888,
        unlocked: false,
        rewards: ['定制表情包一套']
      },
      {
        id: 5,
        name: 'VIP6',
        title: '星辰契约',
        desc: '我愿摘下夜空中最亮的那颗星，以你的名字命名，照亮sonnet的长河',
        amount: 18888,
        unlocked: false,
        rewards: ['定制周星命名权', '署名权']
      },
      {
        id: 6,
        name: 'VIP7',
        title: '定格永恒',
        desc: '时间会流逝，但艺术永存，这一刻的辉煌，将被永远定格在画卷之中',
        amount: 52000,
        unlocked: false,
        rewards: ['定制板卡一张']
      },
      {
        id: 7,
        name: 'VIP8',
        title: '秘密花园',
        desc: '推开这扇门，不再有喧嚣，今夜不去谈论诗句，只有我和你',
        amount: 88888,
        unlocked: false,
        rewards: ['专属小窝陪伴时长60-90分钟']
      },
      {
        id: 8,
        name: 'VIP9',
        title: '金色年轮',
        desc: '岁月的年轮转动，沉淀下的不仅是时光，更是如金子般珍贵的情谊',
        amount: 138888,
        unlocked: false,
        rewards: ['定制专属礼物单']
      },
      {
        id: 9,
        name: 'VIP10',
        title: '加冕仪式',
        desc: '你是灵感的源头，是诗人的信仰。此刻，万众瞩目，为你加冕',
        amount: 288888,
        unlocked: false,
        rewards: ['专属冠名', '群冠一天']
      },
      {
        id: 10,
        name: 'VIP11',
        title: '神话回响',
        desc: '当故事变成神话，你我皆是传说。在每一个特别的日子，Sonnet都会为你奏响回响',
        amount: 500000,
        unlocked: false,
        rewards: ['周年及生日定制实体礼物', '虚拟礼物']
      }
    ]
  },

  onLoad() {
    this.loadUserInfo()
  },

  // 加载用户信息和充值记录
  loadUserInfo() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res) => {
        if (res.result && res.result.success) {
          const userInfo = res.result.data
          this.setData({ userInfo })

          // 计算累计充值金额
          this.calculateTotalConsumption()
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('获取用户信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  // 计算累计消费金额
  calculateTotalConsumption() {
    wx.cloud.callFunction({
      name: 'getTotalRecharge',
      success: (res) => {
        if (res.result && res.result.success) {
          const totalConsumption = res.result.data.totalConsumption
          this.setData({
            totalRecharge: totalConsumption
          })
          this.calculateLevel(totalConsumption)
        } else {
          console.error('获取累计消费失败:', res.result?.error)
          // 使用默认值
          this.calculateLevel(0)
        }
        wx.hideLoading()
      },
      fail: (err) => {
        console.error('获取累计消费失败:', err)
        // 使用默认值
        this.calculateLevel(0)
        wx.hideLoading()
      }
    })
  },

  // 计算当前等级和进度
  calculateLevel(totalAmount) {
    let currentLevel = 0
    let nextLevelAmount = 0

    // 找到当前等级
    for (let i = this.data.levels.length - 1; i >= 0; i--) {
      if (totalAmount >= this.data.levels[i].amount) {
        currentLevel = i
        break
      }
    }

    // 计算下一等级的金额
    if (currentLevel < this.data.levels.length - 1) {
      nextLevelAmount = this.data.levels[currentLevel + 1].amount
    } else {
      nextLevelAmount = this.data.levels[currentLevel].amount // 已经是最高等级
    }

    // 计算进度百分比
    let progressPercent = 0
    if (nextLevelAmount > 0) {
      const currentLevelAmount = this.data.levels[currentLevel].amount
      const progressRange = nextLevelAmount - currentLevelAmount
      const currentProgress = totalAmount - currentLevelAmount
      progressPercent = Math.min((currentProgress / progressRange) * 100, 100)
    }

    // 更新等级解锁状态
    const updatedLevels = this.data.levels.map((level, index) => ({
      ...level,
      unlocked: index <= currentLevel
    }))

    this.setData({
      currentLevel,
      nextLevelAmount,
      progressPercent,
      levels: updatedLevels
    })
  },

  // 获取等级图标
  getLevelIcon(levelId) {
    return ''
  },

  // 获取等级颜色
  getLevelColor(levelId) {
    const colors = [
      '#ff9999', '#ffb366', '#ffff99', '#99ff99', '#99ffff',
      '#9999ff', '#ff99ff', '#ffcccc', '#ffe4b5', '#dda0dd', '#f0e68c'
    ]
    return colors[levelId] || '#e9d5ff'
  },

  // 显示会员权益说明
  showGuide() {
    wx.showModal({
      title: 'VIP会员权益说明',
      content: 'VIP会员系统基于累计消费解锁等级特权\n\n消费金额累积升级，等级自动解锁\n\n每个VIP等级都有专属虚拟/实体礼物\n\n点击等级卡片可查看详细权益和故事\n\nVIP等级越高，享受的特权越丰富',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#7c3aed'
    })
  },

  // 显示等级升级故事
  showLevelStory(e) {
    const levelId = e.currentTarget.dataset.levelId
    const level = this.data.levels[levelId]

    if (!level.unlocked) {
      wx.showToast({
        title: '该等级尚未解锁',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: level.title,
      content: level.upgradeStory,
      showCancel: false,
      confirmText: '浪漫',
      confirmColor: '#ec4899'
    })
  }
})
