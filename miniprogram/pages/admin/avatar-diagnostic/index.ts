// 头像诊断页面
Page({
  data: {
    users: [] as any[],
    loading: true,
    diagnosticResults: [] as any[]
  },

  onLoad() {
    this.loadUsers()
  },

  // 加载用户列表
  loadUsers() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        page: 1,
        pageSize: 50
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            users: res.result.data.users,
            loading: false
          })
          this.diagnoseAvatars()
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        console.error('加载用户失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 诊断头像问题
  diagnoseAvatars() {
    const results = []
    let processedCount = 0

    const processUser = (index: number) => {
      if (index >= this.data.users.length) {
        this.setData({
          diagnosticResults: results
        })
        console.log('头像诊断结果:', results)
        return
      }

      const user = this.data.users[index]
      const result = {
        nickname: user.nickname,
        userId: user.userId,
        avatar: user.avatar,
        status: 'unknown',
        message: '',
        tempUrl: ''
      }

      if (!user.avatar || !user.avatar.trim()) {
        result.status = 'no_avatar'
        result.message = '未设置头像'
        results.push(result)
        processUser(index + 1)
      } else {
        const isCloudFile = user.avatar.startsWith('cloud://')
        const isHttpUrl = user.avatar.startsWith('http://') || user.avatar.startsWith('https://')

        if (!isCloudFile && !isHttpUrl) {
          result.status = 'invalid_format'
          result.message = '头像格式不正确'
          results.push(result)
          processUser(index + 1)
        } else if (isHttpUrl) {
          // 如果是已转换的HTTP URL，直接标记为成功
          result.status = 'success'
          result.message = '头像正常（已转换）'
          result.tempUrl = user.avatar
          results.push(result)
          processUser(index + 1)
        } else {
          // 只有cloud://格式才需要调用API转换
          wx.cloud.getTempFileURL({
            fileList: [user.avatar]
          }).then((tempUrlRes: any) => {
            if (tempUrlRes.errMsg === 'ok' && tempUrlRes.fileList && tempUrlRes.fileList[0]) {
              const fileInfo = tempUrlRes.fileList[0]
              if (fileInfo.tempFileURL) {
                result.status = 'success'
                result.message = '头像正常'
                result.tempUrl = fileInfo.tempFileURL
              } else if (fileInfo.status === 0) {
                result.status = 'file_not_found'
                result.message = '云文件不存在或无权限访问'
              } else {
                result.status = 'error'
                result.message = `获取失败，状态码: ${fileInfo.status}`
              }
            } else {
              result.status = 'api_error'
              result.message = `API调用失败: ${tempUrlRes.errMsg}`
            }

            results.push(result)
            processUser(index + 1)
          }).catch((error: any) => {
            result.status = 'exception'
            result.message = `异常: ${error.message}`
            results.push(result)
            processUser(index + 1)
          })
        }
      }
    }

    processUser(0)
  },

  // 获取状态样式
  getStatusClass(status: string) {
    const classMap: any = {
      'success': 'status-success',
      'no_avatar': 'status-warning',
      'invalid_format': 'status-error',
      'file_not_found': 'status-error',
      'error': 'status-error',
      'api_error': 'status-error',
      'exception': 'status-error',
      'unknown': 'status-warning'
    }
    return classMap[status] || 'status-warning'
  },

  // 获取状态文本
  getStatusText(status: string) {
    const textMap: any = {
      'success': '正常',
      'no_avatar': '未设置',
      'invalid_format': '格式错误',
      'file_not_found': '文件不存在',
      'error': '错误',
      'api_error': 'API错误',
      'exception': '异常',
      'unknown': '未知'
    }
    return textMap[status] || '未知'
  },

  // 刷新诊断
  onRefresh() {
    this.diagnoseAvatars()
  }
})
