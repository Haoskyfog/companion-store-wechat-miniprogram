// 管理员端 - 权益编辑
Page({
  data: {
    bossList: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
    }>,
    selectedBossIndex: -1,
    selectedBoss: null as any,
    benefitsContent: '',
    benefitsList: [] as Array<{
      _id: string;
      bossId: string;
      bossNickname: string;
      content: string;
    }>,
    editingId: '' // 正在编辑的权益ID
  },

  onLoad() {
    this.loadBossList()
    this.loadBenefitsList()
  },

  // 加载老板列表
  loadBossList() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: { role: 'Boss', pageSize: 50 },
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            bossList: res.result.data.users || []
          })
        }
      }
    })
  },

  // 加载已设置权益列表
  loadBenefitsList() {
    wx.cloud.callFunction({
      name: 'getContent',
      data: { type: 'benefits' },
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            benefitsList: res.result.data.benefits || []
          })
        }
      }
    })
  },

  // 选择老板
  onBossChange(e: any) {
    const index = e.detail.value
    const boss = this.data.bossList[index]
    
    // 检查是否已有权益设置
    const existing = this.data.benefitsList.find(b => b.bossId === boss._openid)
    
    this.setData({
      selectedBossIndex: index,
      selectedBoss: boss,
      benefitsContent: existing ? existing.content : '',
      editingId: existing ? existing._id : ''
    })
  },

  // 输入内容
  onContentInput(e: any) {
    this.setData({
      benefitsContent: e.detail.value
    })
  },

  // 保存权益
  saveBenefits() {
    if (!this.data.selectedBoss) {
      wx.showToast({ title: '请选择老板', icon: 'none' })
      return
    }

    if (!this.data.benefitsContent.trim()) {
      wx.showToast({ title: '请输入权益内容', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    wx.cloud.callFunction({
      name: 'updateContent',
      data: {
        type: 'benefits',
        action: this.data.editingId ? 'update' : 'add',
        data: {
          _id: this.data.editingId || undefined,
          bossId: this.data.selectedBoss._openid,
          bossNickname: this.data.selectedBoss.nickname,
          content: this.data.benefitsContent.trim()
        }
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          this.setData({
            selectedBoss: null,
            selectedBossIndex: -1,
            benefitsContent: '',
            editingId: ''
          })
          this.loadBenefitsList()
        } else {
          wx.showToast({ title: res.result?.error || '保存失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 编辑权益
  editBenefits(e: any) {
    const boss = e.currentTarget.dataset.boss
    const index = this.data.bossList.findIndex(b => b._openid === boss.bossId)
    
    this.setData({
      selectedBossIndex: index,
      selectedBoss: this.data.bossList[index] || { _openid: boss.bossId, nickname: boss.bossNickname },
      benefitsContent: boss.content,
      editingId: boss._id
    })

    wx.pageScrollTo({ scrollTop: 0 })
  },

  // 删除权益
  deleteBenefits(e: any) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该老板的权益设置吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          wx.cloud.callFunction({
            name: 'updateContent',
            data: {
              type: 'benefits',
              action: 'delete',
              data: { _id: id }
            },
            success: (res: any) => {
              wx.hideLoading()
              if (res.result && res.result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadBenefitsList()
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            },
            fail: () => {
              wx.hideLoading()
              wx.showToast({ title: '网络错误', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 返回
  onBack() {
    wx.navigateBack()
  }
})
