// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null,
    role: 'Boss' as 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin',
    cloudEnv: 'cloud1-7g62s1bob33a0a2c',
    staffDetailData: null as any,
    userInfoLoading: false // 防止重复调用getUserInfo
  },
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true,
      })
    }

    // 获取用户角色（默认Boss）
    const role = wx.getStorageSync('role') || 'Boss'
    this.globalData.role = role as 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin'

    // 登录
    wx.login({
      success: res => {
        console.log('登录code:', res.code)
        // 调用云函数获取用户信息
        this.getUserInfo()
      },
    })
  },

  // 获取用户信息
  getUserInfo() {
    // 防止重复调用
    if (this.globalData.userInfoLoading) {
      console.log('getUserInfo正在执行中，跳过重复调用')
      return
    }

    this.globalData.userInfoLoading = true

    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        this.globalData.userInfoLoading = false

        if (res.result && res.result.success) {
          this.globalData.userInfo = res.result.data
          if (res.result.data.role) {
            this.globalData.role = res.result.data.role
            wx.setStorageSync('role', res.result.data.role)
          }
          console.log('用户信息加载成功:', res.result.data._openid)
        } else {
          console.error('获取用户信息失败:', res.result?.error)
        }
      },
      fail: (err) => {
        this.globalData.userInfoLoading = false
        console.error('获取用户信息网络失败:', err)
      }
    })
  },

  // 设置用户角色
  setRole(role: 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin') {
    this.globalData.role = role
    wx.setStorageSync('role', role)
  },

  // 用户资料更新回调数组
  userProfileUpdateCallbacks: [] as Array<(userInfo: any) => void>,

  // 注册用户资料更新回调
  registerUserProfileUpdateCallback(callback: (userInfo: any) => void) {
    // 避免重复注册
    if (!this.userProfileUpdateCallbacks.includes(callback)) {
      this.userProfileUpdateCallbacks.push(callback)
    }
  },

  // 注销用户资料更新回调
  unregisterUserProfileUpdateCallback(callback: (userInfo: any) => void) {
    const index = this.userProfileUpdateCallbacks.indexOf(callback)
    if (index > -1) {
      this.userProfileUpdateCallbacks.splice(index, 1)
    }
  },

  // 触发用户资料更新回调
  triggerUserProfileUpdate(userInfo: any) {
    this.userProfileUpdateCallbacks.forEach(callback => {
      try {
        callback(userInfo)
      } catch (error) {
        console.error('用户资料更新回调执行失败:', error)
      }
    })
  },

  // 设置员工详情数据
  setStaffDetailData(staffData: any) {
    this.globalData.staffDetailData = staffData
  },

  // 获取员工详情数据
  getStaffDetailData() {
    return this.globalData.staffDetailData
  }
})