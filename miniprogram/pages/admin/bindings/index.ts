// 管理员端 - 绑定关系管理

Page({
  data: {
    bindings: [] as Array<{
      _id: string;
      bossId: string;
      staffId: string;
      bossInfo: { nickname: string; userId: string; avatar?: string };
      staffInfo: { nickname: string; userId: string; avatar?: string };
      status: string;
      createTime: string;
      creatorId: string;
    }>,
    filteredBindings: [] as Array<any>,
    loading: true,
    refreshing: false,
    bossList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    staffList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    showCreateModal: false,
    showBossSelector: false,
    showStaffSelector: false,
    selectedBoss: null as any,
    selectedStaff: null as any,
    selectedBossIndex: -1,
    selectedStaffIndex: -1,
    // 搜索和筛选
    searchKeyword: '',
    filterType: 'all', // 'all', 'boss', 'staff'
    // 统计数据
    statistics: {
      total: 0,
      active: 0,
      bosses: 0,
      staffs: 0
    }
  },

  onLoad() {
    this.loadBindings()
    this.loadUsers()
  },

  onShow() {
    // 设置TabBar选中状态（如果需要）
  },

  onPullDownRefresh() {
    this.setData({
      refreshing: true
    })
    this.loadBindings(true)
  },

  // 加载绑定关系列表
  loadBindings(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'manageBindings',
      data: {
        action: 'query',
        page: 1,
        pageSize: 100 // 获取绑定关系，使用云函数内部处理用户映射
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const bindings = res.result.data.bindings.map((binding: any) => ({
            ...binding,
            createTime: this.formatTime(binding.createTime)
          }))

          // 处理头像URL转换
          this.processBindingAvatars(bindings).then(processedBindings => {
            // 计算统计数据
            const statistics = {
              total: processedBindings.length,
              active: processedBindings.filter((b: any) => b.status === 'active').length,
              bosses: new Set(processedBindings.map((b: any) => b.bossId)).size,
              staffs: new Set(processedBindings.map((b: any) => b.staffId)).size
            }

            // 应用筛选
            const filteredBindings = this.filterBindings(processedBindings)

            if (refresh) {
              this.setData({
                bindings: processedBindings,
                filteredBindings,
                statistics,
                refreshing: false
              })
              wx.stopPullDownRefresh()
            } else {
              this.setData({
                bindings: processedBindings,
                filteredBindings,
                statistics,
                loading: false
              })
            }
          }).catch(err => {
            console.error('处理绑定头像失败:', err)
            // 如果头像处理失败，至少显示基本数据
            const statistics = {
              total: bindings.length,
              active: bindings.filter((b: any) => b.status === 'active').length,
              bosses: new Set(bindings.map((b: any) => b.bossId)).size,
              staffs: new Set(bindings.map((b: any) => b.staffId)).size
            }
            const filteredBindings = this.filterBindings(bindings)

          if (refresh) {
            this.setData({
              bindings,
                filteredBindings,
                statistics,
              refreshing: false
            })
            wx.stopPullDownRefresh()
          } else {
            this.setData({
              bindings,
                filteredBindings,
                statistics,
              loading: false
            })
          }
          })
        } else {
          this.setData({ loading: false, refreshing: false })
          wx.showToast({ title: res.result?.error || '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载绑定关系失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 处理绑定关系中的头像URL - 前端强制转换 cloud:// URL
  async processBindingAvatars(bindings: any[]) {
    const processedBindings = []

    // 收集所有需要转换的头像URL
    const avatarUrls = []
    for (const binding of bindings) {
      if (binding.bossInfo.avatar && binding.bossInfo.avatar.startsWith('cloud://')) {
        avatarUrls.push(binding.bossInfo.avatar)
      }
      if (binding.staffInfo.avatar && binding.staffInfo.avatar.startsWith('cloud://')) {
        avatarUrls.push(binding.staffInfo.avatar)
      }
    }

    // 去重
    const uniqueUrls = [...new Set(avatarUrls)]

    // 批量转换头像URL
    let tempUrlMap: { [key: string]: string } = {}
    if (uniqueUrls.length > 0) {
      try {
        // 分批处理，避免单次请求太多
        const batchSize = 10
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
          const batch = uniqueUrls.slice(i, i + batchSize)
          const tempRes = await wx.cloud.getTempFileURL({
            fileList: batch
          })
          if (tempRes.fileList) {
            tempRes.fileList.forEach(item => {
              if (item.tempFileURL) {
                tempUrlMap[item.fileID] = item.tempFileURL
              }
            })
          }
          // 小延迟避免并发问题
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        console.log('头像URL转换完成，共转换', Object.keys(tempUrlMap).length, '个')
      } catch (err) {
        console.error('前端转换头像URL失败:', err)
        // 如果转换失败，至少保留原始URL作为fallback
        uniqueUrls.forEach(url => {
          tempUrlMap[url] = url // fallback到原始URL
        })
      }
    }

    // 处理每个绑定关系
    for (const binding of bindings) {
      const processedBinding = { ...binding }

      // 处理老板头像
      if (binding.bossInfo.avatar && binding.bossInfo.avatar.trim() !== '') {
        if (binding.bossInfo.avatar.startsWith('cloud://')) {
          processedBinding.bossInfo.avatar = tempUrlMap[binding.bossInfo.avatar] || binding.bossInfo.avatar
        }
        // 其他格式（包括https://）直接使用
      } else {
        processedBinding.bossInfo.avatar = null
      }

      // 处理员工头像
      if (binding.staffInfo.avatar && binding.staffInfo.avatar.trim() !== '') {
        if (binding.staffInfo.avatar.startsWith('cloud://')) {
          processedBinding.staffInfo.avatar = tempUrlMap[binding.staffInfo.avatar] || binding.staffInfo.avatar
        }
        // 其他格式（包括https://）直接使用
      } else {
        processedBinding.staffInfo.avatar = null
      }

      processedBindings.push(processedBinding)
    }

    return processedBindings
  },

  // 加载用户列表（用于创建绑定）
  loadUsers() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        page: 1,
        pageSize: 1000
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const users = res.result.data.users
          const bossList = users.filter((user: any) => user.role === 'Boss')
          const staffList = users.filter((user: any) => user.role === 'Staff')

          console.log('加载用户列表成功:')
          console.log('  老板数量:', bossList.length)
          console.log('  员工数量:', staffList.length)

          // 处理头像URL转换
          this.processUserAvatars(bossList).then(processedBossList => {
            this.processUserAvatars(staffList).then(processedStaffList => {
              this.setData({
                bossList: processedBossList,
                staffList: processedStaffList
              })
            }).catch(err => {
              console.error('处理员工头像失败:', err)
              this.setData({
                bossList: bossList,
                staffList: staffList
              })
            })
          }).catch(err => {
            console.error('处理老板头像失败:', err)
          this.setData({
              bossList: bossList,
              staffList: staffList
            })
          })
        }
      },
      fail: (err: any) => {
        console.error('获取用户列表失败:', err)
      }
    })
  },

  // 处理用户头像URL - 前端强制转换 cloud:// URL
  async processUserAvatars(users: any[]) {
    const processedUsers = []

    // 收集所有需要转换的头像URL
    const avatarUrls = []
    for (const user of users) {
      if (user.avatar && user.avatar.startsWith('cloud://')) {
        avatarUrls.push(user.avatar)
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
            tempUrlMap[item.fileID] = item.tempFileURL
          })
        }
      } catch (err) {
        console.error('前端转换用户头像URL失败:', err)
      }
    }

    // 处理每个用户
    for (const user of users) {
      const processedUser = { ...user }

      if (user.avatar && user.avatar.trim() !== '') {
        if (user.avatar.startsWith('cloud://')) {
          processedUser.avatar = tempUrlMap[user.avatar] || user.avatar
        }
        // 其他格式（包括https://）直接使用
      } else {
        processedUser.avatar = null
      }

      processedUsers.push(processedUser)
    }

    return processedUsers
  },

  // 搜索输入
  onSearchInput(e: any) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    this.updateFilteredBindings()
  },

  // 设置筛选类型
  setFilterType(e: any) {
    const filterType = e.currentTarget.dataset.type
    this.setData({
      filterType: filterType
    })
    this.updateFilteredBindings()
  },

  // 更新筛选结果
  updateFilteredBindings() {
    const filteredBindings = this.filterBindings(this.data.bindings)
    this.setData({
      filteredBindings
    })
  },

  // 筛选绑定关系
  filterBindings(bindings: Array<{
    _id: string;
    bossId: string;
    staffId: string;
    bossInfo: { nickname: string; userId: string; avatar?: string };
    staffInfo: { nickname: string; userId: string; avatar?: string };
    status: string;
    createTime: string;
    creatorId: string;
  }>) {
    const { searchKeyword, filterType } = this.data

    return bindings.filter(binding => {
      // 搜索筛选
      if (searchKeyword) {
        const bossMatch = binding.bossInfo.nickname.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                         binding.bossInfo.userId.toLowerCase().includes(searchKeyword.toLowerCase())
        const staffMatch = binding.staffInfo.nickname.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                          binding.staffInfo.userId.toLowerCase().includes(searchKeyword.toLowerCase())
        if (!bossMatch && !staffMatch) {
          return false
        }
      }

      // 类型筛选
      if (filterType === 'boss') {
        return binding.status === 'active'
      } else if (filterType === 'staff') {
        return binding.status === 'active'
      }

      return true
    })
  },

  // 显示创建绑定模态框
  showCreateModal() {
    this.setData({
      showCreateModal: true,
      selectedBoss: null,
      selectedStaff: null,
      selectedBossIndex: -1,
      selectedStaffIndex: -1
    })
  },

  // 隐藏模态框
  hideModal() {
    this.setData({
      showCreateModal: false,
      showBossSelector: false,
      showStaffSelector: false,
      selectedBoss: null,
      selectedStaff: null
    })
  },

  // 阻止事件冒泡的占位方法
  preventTap() {
    // 什么都不做，只是阻止事件冒泡
  },

  preventMove() {
    // 什么都不做，只是阻止触摸移动事件冒泡
  },

  // 显示老板选择器
  showBossSelector(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    
    console.log('显示老板选择器, 老板列表数量:', this.data.bossList.length)
    
    if (this.data.bossList.length === 0) {
      wx.showToast({ 
        title: '老板列表为空，请稍后重试', 
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({
      showBossSelector: true,
      showStaffSelector: false
    })
    
    console.log('老板选择器状态:', this.data.showBossSelector)
  },

  // 隐藏老板选择器
  hideBossSelector() {
    this.setData({
      showBossSelector: false
    })
  },

  // 显示员工选择器
  showStaffSelector(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    
    console.log('显示员工选择器, 员工列表数量:', this.data.staffList.length)
    
    if (this.data.staffList.length === 0) {
      wx.showToast({ 
        title: '员工列表为空，请稍后重试', 
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({
      showStaffSelector: true,
      showBossSelector: false
    })
    
    console.log('员工选择器状态:', this.data.showStaffSelector)
  },

  // 隐藏员工选择器
  hideStaffSelector() {
    this.setData({
      showStaffSelector: false
    })
  },

  // 选择老板
  selectBoss(e: any) {
    const selectedBoss = e.currentTarget.dataset.user
    this.setData({
      selectedBoss: selectedBoss,
      showBossSelector: false
    })
  },

  // 选择员工
  selectStaff(e: any) {
    const selectedStaff = e.currentTarget.dataset.user
    this.setData({
      selectedStaff: selectedStaff,
      showStaffSelector: false
    })
  },

  // 清除老板选择
  clearBossSelection(e: any) {
    // 阻止事件冒泡，防止触发showBossSelector
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    this.setData({
      selectedBoss: null
    })
  },

  // 清除员工选择
  clearStaffSelection(e: any) {
    // 阻止事件冒泡，防止触发showStaffSelector
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    this.setData({
      selectedStaff: null
    })
  },

  // 创建绑定关系
  createBinding() {
    if (!this.data.selectedBoss || !this.data.selectedStaff) {
      wx.showToast({ title: '请选择老板和员工', icon: 'none' })
      return
    }

    if (this.data.selectedBoss._openid === this.data.selectedStaff._openid) {
      wx.showToast({ title: '老板和员工不能是同一个人', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建绑定中...' })
    wx.cloud.callFunction({
      name: 'manageBindings',
      data: {
        action: 'create',
        bossId: this.data.selectedBoss._openid,
        staffId: this.data.selectedStaff._openid
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '绑定成功',
            icon: 'success'
          })
          this.hideModal()
          this.loadBindings(true)
        } else {
          wx.showToast({
            title: res.result?.error || '绑定失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('创建绑定失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 查看绑定详情
  viewBindingDetail(e: any) {
    const binding = e.currentTarget.dataset.binding

    wx.showModal({
      title: '绑定关系详情',
      content: `老板：${binding.bossInfo.nickname} (${binding.bossInfo.userId})\n员工：${binding.staffInfo.nickname} (${binding.staffInfo.userId})\n状态：${binding.status === 'active' ? '有效' : '已解绑'}\n创建时间：${binding.createTime}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 删除绑定关系
  deleteBinding(e: any) {
    const { bindingId, bossNickname, staffNickname } = e.currentTarget.dataset

    wx.showModal({
      title: '确认解绑',
      content: `确定要解绑 ${bossNickname} 和 ${staffNickname} 的关系吗？\n\n⚠️ 解绑后，该员工将无法再为该老板创建订单。`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解绑中...' })
          wx.cloud.callFunction({
            name: 'manageBindings',
            data: {
              action: 'delete',
              bindingId: bindingId
            },
            success: (res: any) => {
              wx.hideLoading()
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '解绑成功',
                  icon: 'success'
                })
                this.loadBindings(true)
              } else {
                wx.showToast({
                  title: res.result?.error || '解绑失败',
                  icon: 'none'
                })
              }
            },
            fail: (err: any) => {
              wx.hideLoading()
              console.error('解绑失败:', err)
              wx.showToast({ title: '网络错误', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    return date.toLocaleDateString()
  }
})