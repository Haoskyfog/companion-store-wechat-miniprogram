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
      walletBalance?: number
      createTime: string
      staffCount?: number
      orderCount?: number
      totalOrders?: number
      totalDuration?: number
      canModify?: boolean
    }>,
    groupedUsers: {
      Boss: [],
      Staff: [],
      Admin: [],
      SuperAdmin: []
    } as Record<string, Array<any>>,
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    roleFilter: '', // 角色筛选
    keyword: '', // 搜索关键词
    currentUserRole: '' // 当前用户角色
  },

  async onLoad() {
    // 强制清除所有缓存数据
    this.setData({
      users: [],
      groupedUsers: {
        Boss: [],
        Staff: [],
        Admin: [],
        SuperAdmin: []
      },
      currentUserRole: '',
      loading: true,
      page: 1,
      hasMore: true,
      roleFilter: '',
      keyword: ''
    })

    try {
      const userRole = await this.getCurrentUserRole()
      console.log('用户角色获取成功:', userRole)
      // 确保角色设置后页面重新渲染
      await new Promise(resolve => setTimeout(resolve, 100))
      this.loadUsers()
    } catch (error) {
      console.error('初始化失败:', error)
      // 即使获取角色失败，也尝试加载用户列表
      this.loadUsers()
    }
  },

  // 获取当前用户角色后加载用户列表
  getCurrentUserRole() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getUserInfo',
        success: (res: any) => {
          if (res.result && res.result.success) {
            const userRole = res.result.data.role
            console.log('当前用户角色:', userRole)
            this.setData({
              currentUserRole: userRole
            })
            resolve(userRole)
          } else {
            console.error('获取当前用户角色失败')
            reject(new Error('获取用户角色失败'))
          }
        },
        fail: (err: any) => {
          console.error('获取当前用户角色失败:', err)
          reject(err)
        }
      })
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
      name: 'manageUsers',
      data: {
        action: 'query',
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        role: this.data.roleFilter,
        keyword: this.data.keyword
      },
      success: (res: any) => {
        console.log('manageUsers response:', res.result)
        if (res.result && res.result.success) {
          // 云函数已处理好头像URL，直接使用，并过滤掉无效用户
          const processedUsers = res.result.data.users
            .filter((user: any) => {
              const isValid = user &&
                user._id &&
                typeof user._id === 'string' &&
                user._id.trim().length > 0 &&
                user._openid &&
                typeof user._openid === 'string' &&
                user._openid.trim().length > 0 &&
                user.role &&
                typeof user.role === 'string' &&
                user.role.trim().length > 0 &&
                ['Boss', 'Staff', 'Admin', 'SuperAdmin'].includes(user.role.trim())

              if (!isValid) {
                console.warn('Frontend filtered invalid user:', user)
              }

              return isValid
            })
            .map((user: any) => ({
              ...user,
              createTime: this.formatTime(user.createTime)
            }))

          console.log('Processed users:', processedUsers.length, 'users returned')
          console.log('User roles in response:', processedUsers.map(u => u.role))
          console.log('Current user role:', this.data.currentUserRole)

          // 调试：检查每个用户的有效性
          processedUsers.forEach((user, index) => {
            if (!user._id || !user._openid || !user.role) {
              console.warn(`Invalid user at index ${index}:`, user)
            }
          })

          // 按角色分组用户
          const groupedUsers = {
            Boss: [],
            Staff: [],
            Admin: [],
            SuperAdmin: []
          }

          processedUsers.forEach(user => {
            const role = user.role || 'Staff'
            // 为每个用户添加可修改标记
            user.canModify = this.canModifyRole(user.role)
            if (groupedUsers[role]) {
              groupedUsers[role].push(user)
            } else {
              groupedUsers.Staff.push(user) // 默认归类到员工
            }
          })

          console.log('Grouped users:', {
            Boss: groupedUsers.Boss.length,
            Staff: groupedUsers.Staff.length,
            Admin: groupedUsers.Admin.length,
            SuperAdmin: groupedUsers.SuperAdmin.length
          })

          if (this.data.refreshing) {
            this.setData({
              users: processedUsers,
              groupedUsers,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              users: processedUsers,
              groupedUsers,
              loading: false,
              hasMore: processedUsers.length === this.data.pageSize
            })
          }

          // 强制触发页面重新渲染，确保按钮显示正确
          this.forceUpdate()

          // 调试按钮显示状态
          setTimeout(() => {
            this.debugButtonVisibility()
          }, 500)
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: res.result?.error || '加载失败', icon: 'none' })
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
      name: 'manageUsers',
      data: {
        action: 'query',
        page: nextPage,
        pageSize: this.data.pageSize,
        role: this.data.roleFilter,
        keyword: this.data.keyword
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          // 云函数已处理好头像URL，直接使用，并过滤掉无效用户
          const newUsers = res.result.data.users
            .filter((user: any) => {
              const isValid = user &&
                user._id &&
                typeof user._id === 'string' &&
                user._id.trim().length > 0 &&
                user._openid &&
                typeof user._openid === 'string' &&
                user._openid.trim().length > 0 &&
                user.role &&
                typeof user.role === 'string' &&
                user.role.trim().length > 0 &&
                ['Boss', 'Staff', 'Admin', 'SuperAdmin'].includes(user.role.trim())

              if (!isValid) {
                console.warn('Frontend filtered invalid user in loadMore:', user)
              }

              return isValid
            })
            .map((user: any) => ({
              ...user,
              createTime: this.formatTime(user.createTime)
            }))

          const allUsers = [...this.data.users, ...newUsers]

          // 重新分组所有用户
          const groupedUsers = {
            Boss: [],
            Staff: [],
            Admin: [],
            SuperAdmin: []
          }

          allUsers.forEach(user => {
            const role = user.role || 'Staff'
            // 为每个用户添加可修改标记
            user.canModify = this.canModifyRole(user.role)
            if (groupedUsers[role]) {
              groupedUsers[role].push(user)
            } else {
              groupedUsers.Staff.push(user)
            }
          })

          this.setData({
            users: allUsers,
            groupedUsers,
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
      name: 'manageUsers',
      data: {
        action: 'updateRole',
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

  // 调试方法：检查按钮显示状态
  debugButtonVisibility() {
    console.log('=== 按钮显示调试 ===')
    console.log('当前用户角色:', this.data.currentUserRole)
    console.log('用户列表长度:', this.data.users.length)
    this.data.users.forEach((user, index) => {
      const canModify = this.canModifyRole(user.role)
      console.log(`用户 ${index + 1} (${user.nickname}): 角色=${user.role}, 可修改=${canModify}`)
    })
  },

  // 判断当前用户是否可以修改指定角色的用户
  canModifyRole(targetRole: string) {
    const currentRole = this.data.currentUserRole

    console.log('canModifyRole check:', { currentRole, targetRole })

    if (!currentRole) {
      console.log('No current role set yet, cannot modify')
      return false
    }

    if (currentRole === 'SuperAdmin') {
      // 超级管理员可以修改任何角色，除了同级
      const canModify = targetRole !== 'SuperAdmin'
      console.log('SuperAdmin can modify:', targetRole, '->', canModify)
      return canModify
    } else if (currentRole === 'Admin') {
      // 普通管理员只能修改Boss和Staff角色的用户
      const canModify = targetRole === 'Boss' || targetRole === 'Staff'
      console.log('Admin can modify:', targetRole, '->', canModify)
      return canModify
    }

    // 其他角色无权限修改
    console.log('No permission to modify:', targetRole)
    return false
  },


  // 强制刷新数据
  forceRefresh() {
    console.log('强制刷新数据')
    this.setData({
      users: [],
      groupedUsers: {
        Boss: [],
        Staff: [],
        Admin: [],
        SuperAdmin: []
      },
      loading: true,
      page: 1,
      hasMore: true,
      roleFilter: '',
      keyword: ''
    })
    this.loadUsers()
  },

  // 强制更新页面渲染
  forceUpdate() {
    // 通过修改一个无关的数据来触发页面重新渲染
    const currentRole = this.data.currentUserRole
    this.setData({
      currentUserRole: currentRole + '_force_update'
    }, () => {
      this.setData({
        currentUserRole: currentRole
      })
    })
  },

  // 跳转到头像诊断页面
  goToDiagnostic() {
    wx.navigateTo({
      url: '/pages/admin/avatar-diagnostic/index'
    })
  },

  // 批量创建测试员工
  onCreateTestStaff() {
    wx.showModal({
      title: '批量创建测试员工',
      content: '确定要创建50个测试员工吗？这将添加大量员工用户数据用于测试页面性能。',
      success: (res) => {
        if (res.confirm) {
          this.createTestStaff(50)
        }
      }
    })
  },

  // 执行批量创建测试员工
  createTestStaff(count: number) {
    wx.showLoading({ title: '创建中...' })

    wx.cloud.callFunction({
      name: 'createTestStaff',
      data: {
        count: count
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const data = res.result.data
          wx.showModal({
            title: '创建成功',
            content: `成功创建 ${data.successCount} 个员工用户\n失败 ${data.failedCount} 个\n\n现在可以测试页面加载大量数据的性能了！`,
            showCancel: false,
            success: () => {
              // 刷新用户列表
              this.loadUsers(true)
            }
          })
        } else {
          wx.showToast({
            title: res.result?.error || '创建失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('创建测试员工失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 管理用户钱包
  onManageWallet(e: any) {
    const { userid } = e.currentTarget.dataset
    const user = this.data.users.find(u => u._id === userid)
    if (!user) return

    // 只允许管理老板的钱包
    if (user.role !== 'Boss') {
      wx.showToast({ title: '只能管理老板钱包', icon: 'none' })
      return
    }

    wx.showModal({
      title: '钱包管理',
      content: `${user.nickname}的当前余额：¥${(user.walletBalance || 0).toFixed(2)}\n\n请输入调整金额（正数增加，负数减少）`,
      editable: true,
      placeholderText: '例如：100 或 -50',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content.trim())
          if (isNaN(amount)) {
            wx.showToast({ title: '请输入有效的金额', icon: 'none' })
            return
          }
          this.updateWalletBalance(userid, amount)
        }
      }
    })
  },

  // 更新用户钱包余额
  updateWalletBalance(userId: string, amount: number) {
    wx.showLoading({ title: '更新中...' })
    wx.cloud.callFunction({
      name: 'manageWallet',
      data: {
        action: 'admin_update_wallet',
        userId,
        amount
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '钱包更新成功',
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
        console.error('更新钱包失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})