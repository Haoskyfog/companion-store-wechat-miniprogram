// 老板端 - 我的
const pagePath = 'pages/boss/profile/index';

Page({
  data: {
    userInfo: null as any,
    myStaffs: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      emoji: string;
      color1: string;
      color2: string;
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
        id: 2,
        icon: '🔄',
        title: '申请更换直属',
        desc: '提交更换申请',
        bgColor: '#dbeafe',
        action: 'changeStaff'
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
    app.setUserProfileUpdateCallback(this.onUserProfileUpdated.bind(this))
  },

  onHide() {
    // 清除用户资料更新回调
    const app = getApp<IAppOption>()
    app.clearUserProfileUpdateCallback()
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
            wx.cloud.database().collection('users').doc(binding.staffId).get()
          )

          Promise.all(staffPromises).then((staffResults: any[]) => {
            const staffs = staffResults
              .filter(result => result.data)
              .map((result, index) => ({
                ...result.data,
                emoji: this.getRandomEmoji(),
                color1: this.getRandomColor(),
                color2: this.getRandomColor()
              }))
            this.setData({ myStaffs: staffs })
          })
        }
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('加载员工列表失败:', err)
      })
  },

  // 获取随机表情
  getRandomEmoji() {
    const emojis = ['👧', '👦', '🎮', '🎀', '⭐', '🌟', '💫', '✨']
    return emojis[Math.floor(Math.random() * emojis.length)]
  },

  // 获取随机颜色
  getRandomColor() {
    const colors = ['#fca5a5', '#93c5fd', '#86efac', '#fde047', '#fb7185', '#a78bfa', '#67e8f9', '#5eead4']
    return colors[Math.floor(Math.random() * colors.length)]
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

  // 显示更换直属员工对话框
  showChangeStaffDialog() {
    if (this.data.myStaffs.length === 0) {
      wx.showToast({ title: '暂无直属员工', icon: 'none' })
      return
    }

    const staffList = this.data.myStaffs.map(staff => staff.nickname).join('\n')
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
