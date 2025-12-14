// 管理员端 - 审核中心
const pagePath = 'pages/admin/audit/index';

Page({
  data: {
    activeTab: 'reports', // reports, requests
    reports: [] as Array<{
      _id: string;
      staffInfo: { nickname: string; userId: string };
      bossInfo: { nickname: string; userId: string };
      date: string;
      game: string;
      duration: number;
      platform: string;
      services: string[];
      remark: string;
      images: string[];
      status: string;
      createTime: string;
    }>,
    requests: [] as Array<{
      _id: string;
      bossId: string;
      currentStaffId: string;
      targetStaffId: string;
      reason: string;
      status: string;
      createTime: string;
      bossInfo?: { nickname: string; userId: string };
      currentStaffInfo?: { nickname: string; userId: string };
      targetStaffInfo?: { nickname: string; userId: string };
    }>,
    loading: true,
    tabs: [
      { key: 'reports', label: '报备审核' },
      { key: 'requests', label: '更换申请' }
    ]
  },

  onLoad() {
    this.loadAuditData()
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
  },

  onPullDownRefresh() {
    this.loadAuditData(true)
  },

  // 切换标签
  onTabChange(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      loading: true
    })
    this.loadAuditData()
  },

  // 加载审核数据
  loadAuditData(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    if (this.data.activeTab === 'reports') {
      this.loadReports(refresh)
    } else {
      this.loadRequests(refresh)
    }
  },

  // 加载报备列表
  loadReports(refresh = false) {
    wx.cloud.callFunction({
      name: 'getReports',
      data: {
        status: 'pending',
        page: 1,
        pageSize: 50 // 审核页面显示所有待审核的
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const reports = res.result.data.reports.map((report: any) => ({
            ...report,
            createTime: this.formatTime(report.createTime)
          }))

          this.setData({
            reports,
            loading: false
          })

          if (refresh) {
            wx.stopPullDownRefresh()
          }
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载报备列表失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 加载更换申请列表
  loadRequests(refresh = false) {
    wx.cloud.database().collection('roleChangeRequests')
      .where({
        status: 'pending'
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(async (res: any) => {
        if (res.data) {
          // 获取关联的用户信息
          const requests = []
          for (const request of res.data) {
            const requestWithInfo = { ...request }

            // 获取老板信息
            try {
              const bossRes = await wx.cloud.database().collection('users').doc(request.bossId).get()
              if (bossRes.data) {
                requestWithInfo.bossInfo = {
                  nickname: bossRes.data.nickname,
                  userId: bossRes.data.userId
                }
              }
            } catch (err) {
              console.error('获取老板信息失败:', err)
            }

            // 获取员工信息
            try {
              const currentStaffRes = await wx.cloud.database().collection('users').doc(request.currentStaffId).get()
              if (currentStaffRes.data) {
                requestWithInfo.currentStaffInfo = {
                  nickname: currentStaffRes.data.nickname,
                  userId: currentStaffRes.data.userId
                }
              }

              const targetStaffRes = await wx.cloud.database().collection('users').doc(request.targetStaffId).get()
              if (targetStaffRes.data) {
                requestWithInfo.targetStaffInfo = {
                  nickname: targetStaffRes.data.nickname,
                  userId: targetStaffRes.data.userId
                }
              }
            } catch (err) {
              console.error('获取员工信息失败:', err)
            }

            requestWithInfo.createTime = this.formatTime(request.createTime)
            requests.push(requestWithInfo)
          }

          this.setData({
            requests,
            loading: false
          })
        } else {
          this.setData({ loading: false })
        }

        if (refresh) {
          wx.stopPullDownRefresh()
        }
      })
      .catch((err) => {
        console.error('加载更换申请失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      })
  },

  // 审核报备
  onAuditReport(e: any) {
    const { reportId, action } = e.currentTarget.dataset
    const report = this.data.reports.find(r => r._id === reportId)
    if (!report) return

    const actionText = action === 'approve' ? '通过' : '驳回'

    wx.showModal({
      title: '审核报备',
      content: `确定${actionText} ${report.staffInfo.nickname} 的报备吗？`,
      success: (res) => {
        if (res.confirm) {
          this.auditReport(reportId, action)
        }
      }
    })
  },

  // 执行报备审核
  auditReport(reportId: string, action: 'approve' | 'reject') {
    wx.showLoading({ title: '审核中...' })
    wx.cloud.callFunction({
      name: 'auditReport',
      data: {
        reportId,
        action,
        remark: action === 'reject' ? '审核不通过' : ''
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: action === 'approve' ? '审核通过' : '已驳回',
            icon: 'success'
          })
          // 刷新列表
          this.loadAuditData(true)
        } else {
          wx.showToast({
            title: res.result?.error || '审核失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('审核失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 审核更换申请
  onAuditRequest(e: any) {
    const { requestId, action } = e.currentTarget.dataset
    const request = this.data.requests.find(r => r._id === requestId)
    if (!request) return

    const actionText = action === 'approve' ? '通过' : '驳回'

    wx.showModal({
      title: '审核更换申请',
      content: `确定${actionText} ${request.bossInfo?.nickname} 的更换申请吗？`,
      success: (res) => {
        if (res.confirm) {
          this.auditRequest(requestId, action)
        }
      }
    })
  },

  // 执行更换申请审核
  auditRequest(requestId: string, action: 'approve' | 'reject') {
    wx.showLoading({ title: '审核中...' })
    wx.cloud.callFunction({
      name: 'auditRoleChange',
      data: {
        requestId,
        action,
        remark: action === 'reject' ? '审核不通过' : ''
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: action === 'approve' ? '审核通过' : '已驳回',
            icon: 'success'
          })
          // 刷新列表
          this.loadAuditData(true)
        } else {
          wx.showToast({
            title: res.result?.error || '审核失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('审核失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 预览图片
  onPreviewImage(e: any) {
    const { images, index } = e.currentTarget.dataset
    wx.previewImage({
      current: images[index],
      urls: images
    })
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return date.toLocaleDateString()
  }
})
