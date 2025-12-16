// 管理员端 - 老板充值管理
Page({
  data: {
    bossList: [] as Array<{
      _id: string
      _openid: string
      nickname: string
      userId: string
      avatar?: string
      walletBalance?: number
      staffCount?: number
      createTime: string
    }>,
    loading: true,
    totalBalance: 0,
    todayRecharges: 0
  },

  onLoad() {
    this.loadBossList()
  },

  onPullDownRefresh() {
    this.loadBossList(true)
  },

  // 加载老板列表
  async loadBossList(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    try {
      // 获取所有老板用户
      const res = await wx.cloud.callFunction({
        name: 'getUsers',
        data: {
          role: 'Boss',
          page: 1,
          pageSize: 100 // 获取所有老板
        }
      })

      if (res.result && res.result.success) {
        const bosses = res.result.data.users

        // 计算总余额
        const totalBalance = bosses.reduce((sum: number, boss: any) =>
          sum + (boss.walletBalance || 0), 0)

        // 处理头像URL
        const processedBosses = await this.processBossAvatars(bosses)

        this.setData({
          bossList: processedBosses,
          totalBalance: totalBalance,
          loading: false
        })

        if (refresh) {
          wx.stopPullDownRefresh()
          wx.showToast({
            title: '刷新成功',
            icon: 'success',
            duration: 1500
          })
        }
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        if (refresh) {
          wx.stopPullDownRefresh()
        }
      }
    } catch (error) {
      console.error('加载老板列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
      if (refresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  // 处理老板头像URL
  async processBossAvatars(bosses: any[]) {
    const processedBosses = []

    // 收集所有需要转换的头像URL
    const avatarUrls = []
    for (const boss of bosses) {
      if (boss.avatar && boss.avatar.startsWith('cloud://')) {
        avatarUrls.push(boss.avatar)
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
        console.error('前端转换老板头像URL失败:', err)
      }
    }

    // 处理每个老板
    for (const boss of bosses) {
      let processedBoss = { ...boss }

      if (boss.avatar && boss.avatar.trim() !== '') {
        if (boss.avatar.startsWith('cloud://')) {
          processedBoss.avatar = tempUrlMap[boss.avatar] || boss.avatar
        }
        // 其他格式（包括https://）直接使用
      } else {
        processedBoss.avatar = null
      }

      processedBosses.push(processedBoss)
    }

    return processedBosses
  },

  // 点击充值按钮
  onRechargeTap(e: any) {
    const boss = e.currentTarget.dataset.boss
    this.showRechargeDialog(boss)
  },

  // 显示充值对话框
  showRechargeDialog(boss: any) {
    wx.showModal({
      title: `给 ${boss.nickname} 充值`,
      editable: true,
      placeholderText: '输入金额',
      success: (res) => {
        if (res.confirm && res.content) {
          const amountStr = res.content.trim()
          const amount = this.validateAmount(amountStr)

          if (amount !== null) {
            this.showRechargeConfirm(boss, amount)
          }
        }
      }
    })
  },

  // 验证金额输入
  validateAmount(amountStr: string): number | null {
    // 检查是否为空
    if (!amountStr) {
      wx.showToast({
        title: '请输入金额',
        icon: 'none'
      })
      return null
    }

    // 检查是否为有效数字
    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      wx.showToast({
        title: '请输入有效的数字',
        icon: 'none'
      })
      return null
    }

    // 检查是否为正数
    if (amount <= 0) {
      wx.showToast({
        title: '金额必须是正数',
        icon: 'none'
      })
      return null
    }

    // 检查小数位数（最多2位小数）
    const decimalPart = amountStr.split('.')[1]
    if (decimalPart && decimalPart.length > 2) {
      wx.showToast({
        title: '金额最多支持2位小数',
        icon: 'none'
      })
      return null
    }

    // 检查金额上限（比如单次最多充值10000元）
    if (amount > 10000) {
      wx.showToast({
        title: '单次充值金额不能超过10000元',
        icon: 'none'
      })
      return null
    }

    return amount
  },

  // 显示充值确认对话框
  showRechargeConfirm(boss: any, amount: number) {
    const newBalance = ((boss.walletBalance || 0) + amount).toFixed(2)

    wx.showModal({
      title: '确认充值',
      content: `给 ${boss.nickname} 充值 ¥${amount.toFixed(2)}，余额变为 ¥${newBalance}`,
      success: (res) => {
        if (res.confirm) {
          this.executeRecharge(boss._id, amount)
        }
      }
    })
  },

  // 执行充值操作
  executeRecharge(userId: string, amount: number) {
    wx.showLoading({ title: '充值中...' })

    wx.cloud.callFunction({
      name: 'manageWallet',
      data: {
        action: 'admin_update_wallet',
        userId: userId,
        amount: amount
      },
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: `充值成功 ¥${amount.toFixed(2)}`,
            icon: 'success'
          })
          // 刷新老板列表
          this.loadBossList(true)
        } else {
          wx.showToast({
            title: res.result?.error || '充值失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('充值失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
