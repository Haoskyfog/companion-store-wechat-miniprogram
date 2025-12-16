// 编辑用户资料
Page({
  data: {
    userInfo: {
      nickname: '',
      avatar: '',
      userId: ''
    },
    originalInfo: {
      nickname: '',
      avatar: '',
      userId: ''
    },
    avatarOptions: [
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRtTiaJwIAezSI2DgZUiaVgzadKX5m6iaRwqvZ7E9J4r7jiaHiaO6rx3qz6N6iaK7 via2pL2iaZ7E9J4r7jiaHiaO6rx3qz6N6iaK7/0',
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRtTiaJwIAezSI2DgZUiaVgzadKX5m6iaRwqvZ7E9J4r7jiaHiaO6rx3qz6N6iaK7 via2pL2iaZ7E9J4r7jiaHiaO6rx3qz6N6iaK7/0',
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRtTiaJwIAezSI2DgZUiaVgzadKX5m6iaRwqvZ7E9J4r7jiaHiaO6rx3qz6N6iaK7 via2pL2iaZ7E9J4r7jiaHiaO6rx3qz6N6iaK7/0',
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRtTiaJwIAezSI2DgZUiaVgzadKX5m6iaRwqvZ7E9J4r7jiaHiaO6rx3qz6N6iaK7 via2pL2iaZ7E9J4r7jiaHiaO6rx3qz6N6iaK7/0',
      'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRtTiaJwIAezSI2DgZUiaVgzadKX5m6iaRwqvZ7E9J4r7jiaHiaO6rx3qz6N6iaK7 via2pL2iaZ7E9J4r7jiaHiaO6rx3qz6N6iaK7/0'
    ],
    avatarSelectorVisible: false,
    saving: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 加载用户信息
  loadUserInfo() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const userInfo = res.result.data
          this.setData({
            userInfo: {
              nickname: userInfo.nickname || '',
              avatar: userInfo.avatar || '',
              userId: userInfo.userId || ''
            },
            originalInfo: {
              nickname: userInfo.nickname || '',
              avatar: userInfo.avatar || '',
              userId: userInfo.userId || ''
            }
          })
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载用户信息失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 昵称输入
  onNicknameInput(e: any) {
    this.setData({
      'userInfo.nickname': e.detail.value
    })
  },

  // 用户ID输入
  onUserIdInput(e: any) {
    this.setData({
      'userInfo.userId': e.detail.value
    })
  },

  // 显示头像选择器
  showAvatarSelector() {
    this.setData({
      avatarSelectorVisible: true
    })
  },

  // 隐藏头像选择器
  hideAvatarSelector() {
    this.setData({
      avatarSelectorVisible: false
    })
  },

  // 选择头像
  selectAvatar(e: any) {
    const avatar = e.currentTarget.dataset.avatar
    this.setData({
      'userInfo.avatar': avatar,
      avatarSelectorVisible: false
    })
  },

  // 上传自定义头像
  uploadAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 先进行头像裁剪
        this.cropAvatar(res.tempFilePaths[0])
      }
    })
  },

  // 头像裁剪
  cropAvatar(imagePath: string) {
    wx.showLoading({ title: '加载裁剪...' })
    // 使用微信小程序的图片裁剪功能
    wx.cropImage({
      src: imagePath,
      cropScale: '1:1', // 正方形裁剪
      success: (cropRes) => {
        wx.hideLoading()
        wx.showLoading({ title: '上传中...' })
        // 上传裁剪后的头像
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: cropRes.tempFilePath,
          success: (uploadRes: any) => {
            wx.hideLoading()
            this.setData({
              'userInfo.avatar': uploadRes.fileID,
              avatarSelectorVisible: false
            })
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: (err: any) => {
            wx.hideLoading()
            console.error('上传头像失败:', err)
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('裁剪失败:', err)
        // 如果裁剪失败，直接上传原图
        wx.showLoading({ title: '上传中...' })
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: imagePath,
          success: (uploadRes: any) => {
            wx.hideLoading()
            this.setData({
              'userInfo.avatar': uploadRes.fileID,
              avatarSelectorVisible: false
            })
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: (uploadErr: any) => {
            wx.hideLoading()
            console.error('上传头像失败:', uploadErr)
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 检查是否有更改
  hasChanges() {
    const { userInfo, originalInfo } = this.data
    return userInfo.nickname !== originalInfo.nickname ||
           userInfo.avatar !== originalInfo.avatar ||
           userInfo.userId !== originalInfo.userId
  },

  // 保存资料
  saveProfile() {
    if (!this.validateForm()) {
      return
    }

    if (!this.hasChanges()) {
      wx.showToast({ title: '没有更改', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: this.data.userInfo,
      success: (res: any) => {
        wx.hideLoading()
        this.setData({ saving: false })

        if (res.result && res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          })

          // 更新全局用户信息
          const app = getApp<IAppOption>()
          app.globalData.userInfo = {
            ...app.globalData.userInfo,
            ...this.data.userInfo
          }

          // 发送全局事件通知其他页面用户资料已更新
          app.triggerUserProfileUpdate(this.data.userInfo)

          // 返回上一页
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        } else {
          wx.showToast({
            title: res.result?.error || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        this.setData({ saving: false })
        console.error('保存资料失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 表单验证
  validateForm() {
    const { nickname, userId } = this.data.userInfo

    if (!nickname || nickname.trim() === '') {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }

    if (nickname.length > 20) {
      wx.showToast({ title: '昵称不能超过20个字符', icon: 'none' })
      return false
    }

    if (!userId || userId.trim() === '') {
      wx.showToast({ title: '请输入用户ID', icon: 'none' })
      return false
    }

    if (userId.length > 15) {
      wx.showToast({ title: '用户ID不能超过15个字符', icon: 'none' })
      return false
    }

    // 检查用户ID格式（只能包含字母、数字、下划线）
    const userIdRegex = /^[a-zA-Z0-9_]+$/
    if (!userIdRegex.test(userId)) {
      wx.showToast({ title: '用户ID只能包含字母、数字、下划线', icon: 'none' })
      return false
    }

    return true
  }
})
