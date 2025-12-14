// 管理员端 - 用户管理
const pagePath = 'pages/admin/users/index'

Page({
  data: {
    users: [] as Array<{
      _id: string
      _openid: string
      role: string
      nickname: string
      userId: string
      avatar?: string
      vipLevel?: string
      createTime: string
      staffCount?: number
      orderCount?: number
      totalOrders?: number
      totalDuration?: number
    }>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    roleFilter: '', // 角色筛选
    keyword: '', // 搜索关键词
    currentUserRole: '' // 当前用户角色
  },

  onLoad() {
    // 强制清除所有缓存数据
    this.setData({
      users: [],
      currentUserRole: '',
      loading: true,
      page: 1,
      hasMore: true,
      roleFilter: '',
      keyword: ''
    })
    this.getCurrentUserRole()
  },

  // 获取当前用户角色后加载用户列表
  getCurrentUserRole() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        if (res.result && res.result.success) {
          const userRole = res.result.data.role
          console.log('当前用户角色:', userRole)
          this.setData({
            currentUserRole: userRole
          })
          // 获取角色后才加载用户列表
          this.loadUsers()
        } else {
          console.error('获取当前用户角色失败')
          this.loadUsers()
        }
      },
      fail: (err: any) => {
        console.error('获取当前用户角色失败:', err)
        this.loadUsers()
      }
    })
  },


  onShow() {
    const tabBar = this.getTabBar && this.getTabBar()
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath)
  },

  onPullDownRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    this.loadUsers(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreUsers()
    }
  },

  // 加载用户列表
  loadUsers(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    console.log('loadUsers called, currentUserRole:', this.data.currentUserRole, 'refresh:', refresh)

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        role: this.data.roleFilter,
        keyword: this.data.keyword
      },
      success: (res: any) => {
        console.log('getUsers response:', res.result)
        if (res.result && res.result.success) {
          // 云函数已处理好头像URL，直接使用
          const processedUsers = res.result.data.users.map((user: any) => ({
            ...user,
            createTime: this.formatTime(user.createTime)
          }))

          console.log('Processed users:', processedUsers.length, 'users returned')
          console.log('User roles in response:', processedUsers.map(u => u.role))

          if (this.data.refreshing) {
            this.setData({
              users: processedUsers,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              users: processedUsers,
              loading: false,
              hasMore: processedUsers.length === this.data.pageSize
            })
          }
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载用户列表失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载更多用户
  loadMoreUsers() {
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        page: nextPage,
        pageSize: this.data.pageSize,
        role: this.data.roleFilter,
        keyword: this.data.keyword
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          // 云函数已处理好头像URL，直接使用
          const newUsers = res.result.data.users.map((user: any) => ({
            ...user,
            createTime: this.formatTime(user.createTime)
          }))

          this.setData({
            users: [...this.data.users, ...newUsers],
            hasMore: newUsers.length === this.data.pageSize
          })
        }
      },
      fail: (err: any) => {
        console.error('加载更多用户失败:', err)
        this.setData({ page: this.data.page - 1 }) // 恢复页码
      }
    })
  },

  // 角色筛选
  onRoleFilter(e: any) {
    const role = e.currentTarget.dataset.role
    this.setData({
      roleFilter: role,
      page: 1,
      hasMore: true,
      loading: true
    })
    this.loadUsers()
  },

  // 搜索
  onSearch(e: any) {
    this.setData({
      keyword: e.detail.value,
      page: 1,
      hasMore: true,
      loading: true
    })
    this.loadUsers()
  },

  // 修改用户角色
  onChangeRole(e: any) {
    const { userId, currentRole } = e.currentTarget.dataset
    const user = this.data.users.find(u => u._id === userId)
    if (!user) return

    // 根据当前用户角色过滤可用的目标角色
    let availableRoles: string[] = []

    if (this.data.currentUserRole === 'SuperAdmin') {
      // 超级管理员可以设置所有角色
      availableRoles = ['Boss', 'Staff', 'Admin', 'SuperAdmin']
    } else if (this.data.currentUserRole === 'Admin') {
      // 普通管理员只能在Boss和Staff之间切换
      availableRoles = ['Boss', 'Staff']
    } else {
      // 其他角色无权限修改
      wx.showToast({ title: '无权限修改用户角色', icon: 'none' })
      return
    }

    // 过滤掉当前角色
    availableRoles = availableRoles.filter(role => role !== currentRole)

    if (availableRoles.length === 0) {
      wx.showToast({ title: '无可用的角色选项', icon: 'none' })
      return
    }

    const roleOptions = availableRoles.map(role => ({
      label: this.getRoleName(role),
      value: role
    }))

    wx.showActionSheet({
      itemList: roleOptions.map(r => r.label),
      success: (res) => {
        const newRole = roleOptions[res.tapIndex].value
        if (newRole === currentRole) return

        wx.showModal({
          title: '确认修改',
          content: `确定将 ${user.nickname} 的角色修改为 ${this.getRoleName(newRole)} 吗？`,
          success: (confirmRes) => {
            if (confirmRes.confirm) {
              this.updateUserRole(userId, newRole)
            }
          }
        })
      }
    })
  },

  // 更新用户角色
  updateUserRole(userId: string, newRole: string) {
    wx.showLoading({ title: '更新中...' })
    wx.cloud.callFunction({
      name: 'updateUserRole',
      data: {
        userId,
        newRole
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '角色更新成功',
            icon: 'success'
          })
          // 刷新用户列表
          this.loadUsers(true)
        } else {
          wx.showToast({
            title: res.result?.error || '更新失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('更新角色失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 获取角色显示名称
  getRoleName(role: string) {
    const roleMap = {
      'Boss': '老板',
      'Staff': '员工',
      'Admin': '管理员',
      'SuperAdmin': '超级管理员'
    }
    return roleMap[role as keyof typeof roleMap] || role
  },

  // 获取角色样式
  getRoleClass(role: string) {
    const classMap = {
      'Boss': 'role-boss',
      'Staff': 'role-staff',
      'Admin': 'role-admin',
      'SuperAdmin': 'role-super-admin'
    }
    return classMap[role as keyof typeof classMap] || ''
  },

  // 头像加载失败处理
  onAvatarError(e: any) {
    console.log('头像加载失败:', e)
    const { index } = e.currentTarget.dataset
    // 当头像加载失败时，image组件会自动隐藏，显示默认头像
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    return date.toLocaleDateString()
  },


  // 强制刷新数据
  forceRefresh() {
    console.log('强制刷新数据')
    this.setData({
      users: [],
      loading: true,
      page: 1,
      hasMore: true,
      roleFilter: '',
      keyword: ''
    })
    this.loadUsers()
  },

  // 跳转到头像诊断页面
  goToDiagnostic() {
    wx.navigateTo({
      url: '/pages/admin/avatar-diagnostic/index'
    })
  }
})