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
    keyword: '' // 搜索关键词
  },

  onLoad() {
    this.loadUsers()
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

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        role: this.data.roleFilter,
        keyword: this.data.keyword
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          // 检查每个用户的头像信息
          res.result.data.users.forEach((user: any, index: number) => {
            console.log(`用户 ${index + 1}:`, {
              nickname: user.nickname,
              userId: user.userId,
              avatar: user.avatar,
              avatarType: typeof user.avatar,
              avatarLength: user.avatar ? user.avatar.length : 0,
              hasAvatar: !!(user.avatar && user.avatar.trim()),
              role: user.role
            })
          })

          // 处理用户头像URL - 异步处理所有用户的头像
          this.processUserAvatars(res.result.data.users).then(processedUsers => {
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
          }).catch(err => {
            console.error('处理用户头像失败:', err)
            // 如果处理失败，至少显示基本用户信息
            const basicUsers = res.result.data.users.map((user: any) => ({
              ...user,
              createTime: this.formatTime(user.createTime)
            }))
            this.setData({
              users: basicUsers,
              loading: false,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          })
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
          // 处理新用户的头像URL
          this.processUserAvatars(res.result.data.users).then(processedUsers => {
            this.setData({
              users: [...this.data.users, ...processedUsers],
              hasMore: processedUsers.length === this.data.pageSize
            })
          }).catch(err => {
            console.error('处理新用户头像失败:', err)
            // 如果处理失败，至少显示基本用户信息
            const basicUsers = res.result.data.users.map((user: any) => ({
              ...user,
              createTime: this.formatTime(user.createTime)
            }))
            this.setData({
              users: [...this.data.users, ...basicUsers],
              hasMore: basicUsers.length === this.data.pageSize
            })
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

    const roles = ['Boss', 'Staff', 'Admin', 'SuperAdmin']
    const roleOptions = roles.map(role => ({
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

  // 处理用户头像URL
  processUserAvatars(users: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const processedUsers = []

      console.log('开始处理用户头像，总用户数:', users.length)

      // 串行处理，避免并发过多导致的问题
      const processUser = (index: number) => {
        if (index >= users.length) {
          console.log('头像处理完成')
          resolve(processedUsers)
          return
        }

        const user = users[index]
        console.log(`处理用户 ${user.nickname} 的头像:`, user.avatar)
        const userWithTime = {
          ...user,
          createTime: this.formatTime(user.createTime)
        }

        // 如果用户有头像，处理URL
        if (user.avatar && user.avatar.trim()) {
          // 检查是否是云文件ID（包含cloud://）
          if (user.avatar.includes('cloud://')) {
            console.log(`为用户 ${user.nickname} 获取头像临时URL:`, user.avatar)
            wx.cloud.getTempFileURL({
              fileList: [user.avatar]
            }).then((tempUrlRes: any) => {
              console.log(`getTempFileURL 返回结果:`, tempUrlRes)

              if (tempUrlRes.errMsg === 'ok' && tempUrlRes.fileList && tempUrlRes.fileList[0]) {
                const fileInfo = tempUrlRes.fileList[0]
                if (fileInfo.tempFileURL) {
                  userWithTime.avatar = fileInfo.tempFileURL
                  console.log(`头像临时URL获取成功:`, userWithTime.avatar)
                } else if (fileInfo.status === 0) {
                  console.log(`头像临时URL获取失败，文件不存在或无权限`)
                  // 保持原URL为空，这样会显示默认头像
                  userWithTime.avatar = ''
                } else {
                  console.log(`头像临时URL获取失败，状态码:`, fileInfo.status)
                  userWithTime.avatar = ''
                }
              } else {
                console.log(`getTempFileURL 调用失败:`, tempUrlRes.errMsg)
                userWithTime.avatar = ''
              }

              processedUsers.push(userWithTime)
              processUser(index + 1)
            }).catch((error: any) => {
              console.error(`为用户 ${user.nickname} 获取头像临时URL失败:`, error)
              userWithTime.avatar = ''
              processedUsers.push(userWithTime)
              processUser(index + 1)
            })
          } else {
            console.log(`用户 ${user.nickname} 的头像不是云文件ID格式:`, user.avatar)
            // 如果不是云文件ID，检查是否是HTTP URL
            if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
              // HTTP URL可以直接使用
            } else {
              // 其他格式，设置为空
              userWithTime.avatar = ''
            }
            processedUsers.push(userWithTime)
            processUser(index + 1)
          }
        } else {
          console.log(`用户 ${user.nickname} 没有设置头像`)
          userWithTime.avatar = ''
          processedUsers.push(userWithTime)
          processUser(index + 1)
        }
      }

      processUser(0)
    })
  },

  // 跳转到头像诊断页面
  goToDiagnostic() {
    wx.navigateTo({
      url: '/pages/admin/avatar-diagnostic/index'
    })
  }
})