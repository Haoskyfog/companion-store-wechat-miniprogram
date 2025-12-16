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
      amount: number;
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
    const that = this
    
    // 如果是刷新，先清空列表
    if (refresh) {
      this.setData({ reports: [] })
    }

    wx.cloud.callFunction({
      name: 'getReports',
      data: {
        status: 'pending',
        page: 1,
        pageSize: 50
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          console.log('管理员收到报备数据:', res.result.data.reports)

          // 检查每个报备的amount字段
          res.result.data.reports.forEach((report: any, index: number) => {
            console.log(`管理员报备${index + 1}的amount:`, report.amount, '类型:', typeof report.amount)
          })

          // 过滤 pending 状态的报备
          let reports = res.result.data.reports
            .filter((report: any) => report.status === 'pending')
            .map((report: any) => ({
            ...report,
              createTime: that.formatTime(report.createTime)
          }))

          console.log('📋 加载了', reports.length, '个报备')

          // 转换所有报备的图片为临时URL
          that.convertReportImages(reports).then((convertedReports) => {
            console.log('🎯 准备设置数据到页面...')
            console.log('报备数量:', convertedReports.length)
            
            // 验证图片是否已转换
            convertedReports.forEach((r: any, i: number) => {
              if (r.images && r.images.length > 0) {
                console.log(`报备${i + 1}的图片:`, r.images[0].substring(0, 50))
                if (r.images[0].startsWith('https://')) {
                  console.log('  ✅ 已转换为 https://')
                } else if (r.images[0].startsWith('cloud://')) {
                  console.log('  ❌ 还是 cloud://')
                }
              }
            })
            
            that.setData({
              reports: convertedReports,
            loading: false
          })
            
            console.log('✨ 数据已设置到页面')

          if (refresh) {
            wx.stopPullDownRefresh()
          }
          }).catch((err) => {
            console.error('❌ 转换图片时出错:', err)
            // 如果转换失败，直接使用原始数据
            that.setData({
              reports: reports,
              loading: false
            })
          })
        } else {
          console.error('getReports返回失败:', res.result)
          that.setData({ loading: false })
          wx.showToast({ title: res.result?.error || '加载失败', icon: 'none' })
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        console.error('加载报备列表失败:', err)
        that.setData({ loading: false })
        wx.showToast({ title: '网络错误: ' + (err.errMsg || err.message || '未知错误'), icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 转换报备图片和员工头像为临时URL
  async convertReportImages(reports: any[]) {
    console.log('🔄 开始转换报备图片和员工头像...')

    // 步骤1: 收集所有需要转换的 cloud:// fileID（去重）
    const allCloudFileIds = new Set<string>()

    reports.forEach((report) => {
      // 收集报备图片
      if (report.images && report.images.length > 0) {
        report.images.forEach((img: string) => {
          if (img && typeof img === 'string' && img.startsWith('cloud://')) {
            allCloudFileIds.add(img)
          }
        })
      }

      // 收集员工头像
      if (report.staffInfo && report.staffInfo.avatar && report.staffInfo.avatar.startsWith('cloud://')) {
        allCloudFileIds.add(report.staffInfo.avatar)
      }

      // 收集老板头像
      if (report.bossInfo && report.bossInfo.avatar && report.bossInfo.avatar.startsWith('cloud://')) {
        allCloudFileIds.add(report.bossInfo.avatar)
      }
    })
    
    const cloudFileList = Array.from(allCloudFileIds)
    console.log('📷 收集到', cloudFileList.length, '个云存储图片需要转换')
    
    if (cloudFileList.length === 0) {
      console.log('✅ 没有需要转换的图片')
      return reports
    }
    
    // 步骤2: 只调用一次 getTempFileURL
    try {
      console.log('📤 批量获取临时URL...')
      const tempUrlRes = await wx.cloud.getTempFileURL({
        fileList: cloudFileList
      })
      
      console.log('✅ getTempFileURL 成功，返回', tempUrlRes.fileList.length, '个结果')
      
      // 步骤3: 建立 fileID -> tempFileURL 的映射（只接受 status === 0 且有 tempFileURL 的）
      const fileIdToTempUrl = new Map<string, string>()
      
      tempUrlRes.fileList.forEach((file: any) => {
        console.log('  文件结果:', {
          fileID: file.fileID.substring(0, 50) + '...',
          status: file.status,
          errMsg: file.errMsg,
          tempFileURL: file.tempFileURL ? file.tempFileURL.substring(0, 50) + '...' : 'null'
        })
        
        // 只允许 status === 0 且存在 tempFileURL 的映射
        if (file.status === 0 && file.tempFileURL) {
          fileIdToTempUrl.set(file.fileID, file.tempFileURL)
          console.log('  ✅ 映射成功')
        } else {
          console.error('  ❌ 文件获取失败 - status:', file.status, 'errMsg:', file.errMsg)
          // status: 0 = 成功, -1 = 文件不存在, 1 = 其他错误
        }
      })
      
      // 步骤4: 遍历 reports，替换所有 cloud:// 为 https://
      reports.forEach((report, index) => {
        if (report.images && report.images.length > 0) {
          const convertedImages: string[] = []
          
          report.images.forEach((img: string) => {
            if (img && img.startsWith('cloud://')) {
              // 查找对应的 tempFileURL
              const tempUrl = fileIdToTempUrl.get(img)
              if (tempUrl) {
                // 成功转换为 https://
                convertedImages.push(tempUrl)
              } else {
                // 找不到 tempFileURL，保留 cloud:// 用于缩略图显示
                // 小程序的 <image> 组件应该能显示 cloud:// 缩略图
                console.log('  ⚠️ 保留 cloud:// 用于缩略图:', img.substring(0, 40) + '...')
                convertedImages.push(img)
              }
            } else if (img && img.startsWith('https://')) {
              // 已经是 https://，保留
              convertedImages.push(img)
            }
            // 其他格式的URL直接忽略
          })
          
          report.images = convertedImages
          
          // 步骤5: 验证图片URL格式
          const httpsCount = report.images.filter((img: string) => img && img.startsWith('https://')).length
          const cloudCount = report.images.filter((img: string) => img && img.startsWith('cloud://')).length
          
          if (httpsCount > 0) {
            console.log(`✅ 报备${index + 1}图片已转换 (${httpsCount}/${report.images.length}张 https://):`, report.images[0].substring(0, 60) + '...')
          }
          
          if (cloudCount > 0) {
            console.warn(`⚠️ 报备${index + 1}有 ${cloudCount} 张图片保留为 cloud://（用于缩略图显示）`)
          }
          
          if (report.images.length === 0) {
            console.log(`ℹ️ 报备${index + 1}没有有效图片`)
          }
        }

        // 转换员工头像
        if (report.staffInfo && report.staffInfo.avatar && report.staffInfo.avatar.startsWith('cloud://')) {
          const staffAvatarTempUrl = fileIdToTempUrl.get(report.staffInfo.avatar)
          if (staffAvatarTempUrl) {
            report.staffInfo.avatar = staffAvatarTempUrl
            console.log(`✅ 员工头像已转换:`, report.staffInfo.avatar.substring(0, 60) + '...')
          }
        }

        // 转换老板头像
        if (report.bossInfo && report.bossInfo.avatar && report.bossInfo.avatar.startsWith('cloud://')) {
          const bossAvatarTempUrl = fileIdToTempUrl.get(report.bossInfo.avatar)
          if (bossAvatarTempUrl) {
            report.bossInfo.avatar = bossAvatarTempUrl
            console.log(`✅ 老板头像已转换:`, report.bossInfo.avatar.substring(0, 60) + '...')
          }
        }
      })

      console.log('🎉 所有图片和头像转换完成！')
      
    } catch (err) {
      console.error('❌ 批量转换图片失败:', err)
    }
    
    return reports
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
              const bossRes = await wx.cloud.database().collection('users')
                .where({ _openid: request.bossId })
                .get()
              if (bossRes.data && bossRes.data.length > 0) {
                requestWithInfo.bossInfo = {
                  nickname: bossRes.data[0].nickname,
                  userId: bossRes.data[0].userId
                }
              } else {
                requestWithInfo.bossInfo = {
                  nickname: '老板已删除',
                  userId: '未知'
                }
              }
            } catch (err) {
              console.error('获取老板信息失败:', err)
              requestWithInfo.bossInfo = {
                nickname: '老板已删除',
                userId: '未知'
              }
            }

            // 获取员工信息
            try {
              const currentStaffRes = await wx.cloud.database().collection('users')
                .where({ _openid: request.currentStaffId })
                .get()
              if (currentStaffRes.data && currentStaffRes.data.length > 0) {
                requestWithInfo.currentStaffInfo = {
                  nickname: currentStaffRes.data[0].nickname,
                  userId: currentStaffRes.data[0].userId
                }
              } else {
                requestWithInfo.currentStaffInfo = {
                  nickname: '员工已删除',
                  userId: '未知'
                }
              }

              const targetStaffRes = await wx.cloud.database().collection('users')
                .where({ _openid: request.targetStaffId })
                .get()
              if (targetStaffRes.data && targetStaffRes.data.length > 0) {
                requestWithInfo.targetStaffInfo = {
                  nickname: targetStaffRes.data[0].nickname,
                  userId: targetStaffRes.data[0].userId
                }
              } else {
                requestWithInfo.targetStaffInfo = {
                  nickname: '员工已删除',
                  userId: '未知'
                }
              }
            } catch (err) {
              console.error('获取员工信息失败:', err)
              requestWithInfo.currentStaffInfo = {
                nickname: '员工已删除',
                userId: '未知'
              }
              requestWithInfo.targetStaffInfo = {
                nickname: '员工已删除',
                userId: '未知'
              }
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
            icon: 'success',
            duration: 1000
          })
          
          // 直接重新加载列表，不使用旧数据
          this.setData({ loading: true })
          
          setTimeout(() => {
            this.loadReports(false)
          }, 800)
          
          // 如果审核通过，刷新管理员首页的统计数据
          if (action === 'approve') {
            // 获取页面栈，找到管理员首页并刷新
            const pages = getCurrentPages()
            for (let i = pages.length - 1; i >= 0; i--) {
              const page = pages[i]
              if (page.route === 'pages/admin/dashboard/index') {
                // 调用管理员首页的刷新方法
                if (typeof (page as any).loadDashboardData === 'function') {
                  setTimeout(() => {
                    (page as any).loadDashboardData(true)
                  }, 1000)
                }
                break
              }
            }
          }
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

  // 图片加载成功
  onImageLoad(e: any) {
    console.log('✅ 图片加载成功')
  },

  // 图片加载失败
  onImageError(e: any) {
    console.error('❌ 图片加载失败:', e.detail)
    wx.showToast({ 
      title: '图片加载失败，请刷新重试', 
      icon: 'none',
      duration: 2000
    })
  },

  // 预览图片
  onPreviewImage(e: any) {
    const { reportImages, index } = e.currentTarget.dataset
    
    console.log('🖼️ 预览图片，索引:', index, '图片列表:', reportImages)
    
    if (reportImages && reportImages.length > 0) {
      // 检查图片URL格式
      const firstImage = reportImages[0]
      console.log('第一张图片URL:', firstImage)
      
      if (firstImage.startsWith('https://')) {
        console.log('✅ 图片已是 https:// 格式，直接预览')
        wx.previewImage({
          current: reportImages[index],
          urls: reportImages,
          fail: (err) => {
            console.error('❌ 预览失败:', err)
            wx.showToast({ title: '图片预览失败', icon: 'none' })
          }
        })
      } else if (firstImage.startsWith('cloud://')) {
        console.log('⚠️ 图片还是 cloud:// 格式，需要转换')
        wx.showLoading({ title: '加载中...' })
        wx.cloud.getTempFileURL({
          fileList: reportImages,
          success: (res) => {
            wx.hideLoading()
            const urls = res.fileList.map((file: any) => file.tempFileURL || file.fileID)
            console.log('✅ 转换完成，预览:', urls)
    wx.previewImage({
              current: urls[index],
              urls: urls
            })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('❌ 获取临时URL失败:', err)
            wx.showToast({ title: '图片加载失败', icon: 'none' })
          }
        })
      } else {
        console.error('❌ 未知的图片URL格式:', firstImage)
        wx.showToast({ title: '图片格式错误', icon: 'none' })
      }
    } else {
      wx.showToast({ title: '没有图片可预览', icon: 'none' })
    }
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
