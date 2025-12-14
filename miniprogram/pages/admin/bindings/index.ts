// 管理员端 - 绑定关系管理
const pagePath = 'pages/admin/bindings/index';

Page({
  data: {
    bindings: [] as Array<{
      _id: string;
      bossId: string;
      staffId: string;
      bossInfo: { nickname: string; userId: string };
      staffInfo: { nickname: string; userId: string };
      status: string;
      createTime: string;
      creatorId: string;
    }>,
    loading: true,
    refreshing: false,
    bossList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    staffList: [] as Array<{ _openid: string; nickname: string; userId: string }>,
    showCreateModal: false,
    selectedBossId: '',
    selectedStaffId: ''
  },

  onLoad() {
    this.loadBindings()
    this.loadUsers()
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
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
      name: 'getUsers',
      data: {
        role: '', // 获取所有用户
        page: 1,
        pageSize: 1000 // 获取足够多的用户数据
      },
      success: (userRes: any) => {
        if (userRes.result && userRes.result.success) {
          // 获取用户数据用于映射
          const users = userRes.result.data.users
          const userMap = users.reduce((map: any, user: any) => {
            map[user._openid] = user
            return map
          }, {})

          // 查询绑定关系
          wx.cloud.database().collection('bindings')
            .where({
              status: 'active'
            })
            .orderBy('createTime', 'desc')
            .get()
            .then((bindingRes: any) => {
              if (bindingRes.data) {
                const bindings = bindingRes.data.map((binding: any) => ({
                  ...binding,
                  bossInfo: userMap[binding.bossId] ? {
                    nickname: userMap[binding.bossId].nickname,
                    userId: userMap[binding.bossId].userId
                  } : { nickname: '未知', userId: '' },
                  staffInfo: userMap[binding.staffId] ? {
                    nickname: userMap[binding.staffId].nickname,
                    userId: userMap[binding.staffId].userId
                  } : { nickname: '未知', userId: '' },
                  createTime: this.formatTime(binding.createTime)
                }))

                if (refresh) {
                  this.setData({
                    bindings,
                    refreshing: false
                  })
                  wx.stopPullDownRefresh()
                } else {
                  this.setData({
                    bindings,
                    loading: false
                  })
                }
              } else {
                this.setData({ loading: false, refreshing: false })
                wx.stopPullDownRefresh()
              }
            })
            .catch((err) => {
              console.error('加载绑定关系失败:', err)
              this.setData({ loading: false, refreshing: false })
              wx.showToast({ title: '网络错误', icon: 'none' })
              wx.stopPullDownRefresh()
            })
        }
      },
      fail: (err: any) => {
        console.error('获取用户数据失败:', err)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
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

          this.setData({
            bossList,
            staffList
          })
        }
      },
      fail: (err: any) => {
        console.error('获取用户列表失败:', err)
      }
    })
  },

  // 显示创建绑定模态框
  showCreateModal() {
    this.setData({
      showCreateModal: true,
      selectedBossId: '',
      selectedStaffId: ''
    })
  },

  // 隐藏模态框
  hideModal() {
    this.setData({
      showCreateModal: false,
      selectedBossId: '',
      selectedStaffId: ''
    })
  },

  // 选择老板
  onBossChange(e: any) {
    const selectedBoss = this.data.bossList[e.detail.value]
    this.setData({
      selectedBossId: selectedBoss._openid
    })
  },

  // 选择员工
  onStaffChange(e: any) {
    const selectedStaff = this.data.staffList[e.detail.value]
    this.setData({
      selectedStaffId: selectedStaff._openid
    })
  },

  // 创建绑定关系
  createBinding() {
    if (!this.data.selectedBossId || !this.data.selectedStaffId) {
      wx.showToast({ title: '请选择老板和员工', icon: 'none' })
      return
    }

    if (this.data.selectedBossId === this.data.selectedStaffId) {
      wx.showToast({ title: '老板和员工不能是同一个人', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })
    wx.cloud.callFunction({
      name: 'bindBossStaff',
      data: {
        bossId: this.data.selectedBossId,
        staffId: this.data.selectedStaffId
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

  // 删除绑定关系
  deleteBinding(e: any) {
    const { bindingId, bossNickname, staffNickname } = e.currentTarget.dataset

    wx.showModal({
      title: '确认解绑',
      content: `确定要解绑 ${bossNickname} 和 ${staffNickname} 的关系吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解绑中...' })
          wx.cloud.database().collection('bindings')
            .doc(bindingId)
            .update({
              data: {
                status: 'inactive',
                updateTime: wx.cloud.database().serverDate()
              }
            })
            .then(() => {
              wx.hideLoading()
              wx.showToast({
                title: '解绑成功',
                icon: 'success'
              })
              this.loadBindings(true)
            })
            .catch((err) => {
              wx.hideLoading()
              console.error('解绑失败:', err)
              wx.showToast({ title: '解绑失败', icon: 'none' })
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