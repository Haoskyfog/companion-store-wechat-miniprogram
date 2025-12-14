// 老板端 - 更换直属员工
Page({
  data: {
    myStaffs: [] as Array<{
      _id: string;
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      totalOrders?: number;
      totalDuration?: number;
    }>,
    availableStaffs: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      totalOrders?: number;
      totalDuration?: number;
    }>,
    loading: true,
    selectedCurrentStaff: '',
    selectedTargetStaff: '',
    reason: '',
    submitting: false
  },

  onLoad() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData(true)
  },

  // 加载数据
  loadData(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    // 获取用户信息
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (userRes: any) => {
        if (userRes.result && userRes.result.success) {
          const userInfo = userRes.result.data

          // 查询绑定关系获取直属员工
          wx.cloud.database().collection('bindings')
            .where({
              bossId: userInfo._openid,
              status: 'active'
            })
            .get()
            .then((bindingRes: any) => {
              if (bindingRes.data && bindingRes.data.length > 0) {
                // 获取员工详细信息
                const staffPromises = bindingRes.data.map((binding: any) =>
                  wx.cloud.database().collection('users').doc(binding.staffId).get()
                )

                Promise.all(staffPromises).then((staffResults: any[]) => {
                  const myStaffs = staffResults
                    .filter(result => result.data)
                    .map(result => result.data)

                  // 为员工添加统计数据
                  this.addStaffStatistics(myStaffs).then(staffsWithStats => {
                    // 获取所有可用的员工（除了当前直属员工）
                    this.loadAvailableStaffs(userInfo._openid, myStaffs.map(s => s._openid))
                      .then(availableStaffs => {
                        this.setData({
                          myStaffs: staffsWithStats,
                          availableStaffs,
                          loading: false
                        })

                        if (refresh) {
                          wx.stopPullDownRefresh()
                        }
                      })
                  })
                })
              } else {
                // 没有直属员工，直接加载可用员工
                this.loadAvailableStaffs(userInfo._openid, [])
                  .then(availableStaffs => {
                    this.setData({
                      myStaffs: [],
                      availableStaffs,
                      loading: false
                    })

                    if (refresh) {
                      wx.stopPullDownRefresh()
                    }
                  })
              }
            })
        }
      },
      fail: (err: any) => {
        console.error('获取用户信息失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载可用员工列表
  loadAvailableStaffs(bossId: string, excludeStaffIds: string[]): Promise<any[]> {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'getUsers',
        data: {
          role: 'Staff',
          page: 1,
          pageSize: 100
        },
        success: (res: any) => {
          if (res.result && res.result.success) {
            let availableStaffs = res.result.data.users.filter((user: any) =>
              !excludeStaffIds.includes(user._openid)
            )

            // 为员工添加统计数据
            this.addStaffStatistics(availableStaffs).then(staffsWithStats => {
              resolve(staffsWithStats)
            })
          } else {
            resolve([])
          }
        },
        fail: () => {
          resolve([])
        }
      })
    })
  },

  // 为员工添加统计数据
  addStaffStatistics(staffs: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      const promises = staffs.map(staff =>
        wx.cloud.database().collection('orders')
          .where({
            staffId: staff._openid,
            status: 'completed'
          })
          .get()
          .then((orderRes: any) => {
            const totalOrders = orderRes.data.length
            const totalDuration = orderRes.data.reduce((sum: number, order: any) =>
              sum + (order.duration || 0), 0
            )

            return {
              ...staff,
              totalOrders,
              totalDuration
            }
          })
          .catch(() => ({
            ...staff,
            totalOrders: 0,
            totalDuration: 0
          }))
      )

      Promise.all(promises).then(results => {
        resolve(results)
      })
    })
  },

  // 选择当前员工
  onCurrentStaffSelect(e: any) {
    const staffId = e.currentTarget.dataset.staffId
    this.setData({
      selectedCurrentStaff: staffId,
      selectedTargetStaff: '' // 重置目标员工选择
    })
  },

  // 选择目标员工
  onTargetStaffSelect(e: any) {
    const staffId = e.currentTarget.dataset.staffId
    this.setData({
      selectedTargetStaff: staffId
    })
  },

  // 输入申请原因
  onReasonInput(e: any) {
    this.setData({
      reason: e.detail.value
    })
  },

  // 提交更换申请
  onSubmit() {
    if (!this.validateForm()) {
      return
    }

    wx.showModal({
      title: '确认提交',
      content: '确定要提交更换申请吗？提交后需要管理员审核。',
      success: (res) => {
        if (res.confirm) {
          this.submitRequest()
        }
      }
    })
  },

  // 执行提交
  submitRequest() {
    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    wx.cloud.callFunction({
      name: 'requestRoleChange',
      data: {
        currentStaffId: this.data.selectedCurrentStaff,
        targetStaffId: this.data.selectedTargetStaff,
        reason: this.data.reason
      },
      success: (res: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })

        if (res.result && res.result.success) {
          wx.showToast({
            title: '申请提交成功',
            icon: 'success',
            duration: 2000
          })

          // 重置表单
          this.setData({
            selectedCurrentStaff: '',
            selectedTargetStaff: '',
            reason: ''
          })

          // 重新加载数据
          setTimeout(() => {
            this.loadData(true)
          }, 2000)
        } else {
          wx.showToast({
            title: res.result?.error || '提交失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        console.error('提交更换申请失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 表单验证
  validateForm(): boolean {
    if (!this.data.selectedCurrentStaff) {
      wx.showToast({ title: '请选择要更换的员工', icon: 'none' })
      return false
    }

    if (!this.data.selectedTargetStaff) {
      wx.showToast({ title: '请选择目标员工', icon: 'none' })
      return false
    }

    if (this.data.selectedCurrentStaff === this.data.selectedTargetStaff) {
      wx.showToast({ title: '目标员工不能与当前员工相同', icon: 'none' })
      return false
    }

    if (!this.data.reason || this.data.reason.trim() === '') {
      wx.showToast({ title: '请输入更换原因', icon: 'none' })
      return false
    }

    return true
  },

  // 格式化时长显示
  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分钟`
    }
    return `${hours}小时`
  }
})