// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null,
    role: 'Boss' as 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin',
    cloudEnv: 'cloud1-7g62s1bob33a0a2c',
    staffDetailData: null as any
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
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.globalData.userInfo = res.result.data
          if (res.result.data.role) {
            this.globalData.role = res.result.data.role
            wx.setStorageSync('role', res.result.data.role)
          }
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
      }
    })
  },

  // 设置用户角色
  setRole(role: 'Boss' | 'Staff' | 'Admin' | 'SuperAdmin') {
    this.globalData.role = role
    wx.setStorageSync('role', role)
  },

  // 用户资料更新回调
  onUserProfileUpdate: null as ((userInfo: any) => void) | null,

  // 设置用户资料更新回调
  setUserProfileUpdateCallback(callback: (userInfo: any) => void) {
    this.onUserProfileUpdate = callback
  },

  // 清除用户资料更新回调
  clearUserProfileUpdateCallback() {
    this.onUserProfileUpdate = null
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