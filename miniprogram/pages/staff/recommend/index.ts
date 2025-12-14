// 员工端 - 推荐页
const pagePath = 'pages/staff/recommend/index';

Page({
  data: {
    todayStaffs: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      tags: string[];
      intro: string;
      color1: string;
      color2: string;
    }>,
    newStaffs: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      tags: string[];
      intro: string;
      color1: string;
      color2: string;
    }>,
    loading: true
  },

  onLoad() {
    this.loadRecommendContent()
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.syncRole && tabBar.syncRole('Staff');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }
  },

  // 加载推荐内容
  loadRecommendContent() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getContent',
      success: (res: any) => {
        if (res.result && res.result.success) {
          const content = res.result.data
          const recommendContent = content.recommend || []

          // 找到今日推荐的内容
          const todayRecommend = recommendContent.find((item: any) =>
            item.type === 'recommend' && item.status === 'active'
          )

          if (todayRecommend && todayRecommend.staffIds && todayRecommend.staffIds.length > 0) {
            // 根据员工ID获取员工详情
            this.loadStaffDetails(todayRecommend.staffIds.slice(0, 3))
          } else {
            // 如果没有推荐内容，显示默认数据或空数据
            this.setData({
              todayStaffs: [],
              loading: false
            })
            this.loadNewStaffs()
          }

          // TODO: 加载新人推荐（可以从员工表中按注册时间排序获取最新员工）
          this.loadNewStaffs()
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        console.error('加载推荐内容失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 加载新人推荐（最近注册的员工）
  loadNewStaffs() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 3
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const newStaffs = res.result.data.users.slice(0, 3).map((staff: any, index: number) => ({
            _openid: staff._openid,
            nickname: staff.nickname,
            userId: staff.userId,
            avatar: staff.avatar,
            tags: ['新人', '王者荣耀'],
            intro: '新人报到，请多关照～',
            color1: this.getRandomColor1(index + 3),
            color2: this.getRandomColor2(index + 3)
          }))

          this.setData({
            newStaffs
          })
        }
      },
      fail: (err: any) => {
        console.error('加载新人数据失败:', err)
      }
    })
  },

  // 获取随机颜色1
  getRandomColor1(index: number) {
    const colors = ['#fca5a5', '#93c5fd', '#86efac', '#f59e0b', '#c084fc', '#06b6d4']
    return colors[index % colors.length]
  },

  // 根据员工ID加载员工详情
  loadStaffDetails(staffIds: string[]) {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 50
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          const allStaffs = res.result.data.users
          const todayStaffs = staffIds.map((staffId, index) => {
            const staff = allStaffs.find((s: any) => s._openid === staffId)
            if (staff) {
              // 获取员工的语音设置
              const voiceSettings = staff.voiceSettings || {}
              return {
                _openid: staff._openid,
                nickname: staff.nickname,
                userId: staff.userId,
                avatar: staff.avatar,
                tags: voiceSettings.voiceType ? [`${this.getVoiceTypeLabel(voiceSettings.voiceType)}音色`] : ['王者荣耀'],
                intro: voiceSettings.introduction || '今日推荐员工，专业陪玩服务！',
                voiceType: voiceSettings.voiceType,
                audioUrl: voiceSettings.audioUrl,
                color1: this.getRandomColor1(index),
                color2: this.getRandomColor2(index)
              }
            }
            return null
          }).filter(Boolean)

          this.setData({
            todayStaffs,
            loading: false
          })

          this.loadNewStaffs()
        } else {
          this.setData({ loading: false })
          this.loadNewStaffs()
        }
      },
      fail: (err: any) => {
        console.error('加载员工详情失败:', err)
        this.setData({ loading: false })
        this.loadNewStaffs()
      }
    })
  },

  // 获取音色类型标签
  getVoiceTypeLabel(voiceType: string) {
    const voiceLabels: { [key: string]: string } = {
      'normal': '普通',
      'cute': '可爱',
      'cool': '酷炫',
      'mature': '成熟'
    }
    return voiceLabels[voiceType] || '普通'
  },

  // 获取随机颜色2
  getRandomColor2(index: number) {
    const colors = ['#c084fc', '#67e8f9', '#5eead4', '#eab308', '#a855f7', '#0891b2']
    return colors[index % colors.length]
  },

  // 查看员工详情
  viewStaffDetail(e: any) {
    const staff = e.currentTarget.dataset.staff
    console.log('查看员工详情:', staff)

    // 传递员工信息到详情页
    wx.navigateTo({
      url: `/pages/boss/staff-detail/index?staffId=${staff._openid}`,
      success: () => {
        // 可以通过全局数据传递员工信息
        const app = getApp<IAppOption>()
        if (app.setStaffDetailData) {
          app.setStaffDetailData(staff)
        }
      }
    })
  },

  // 播放员工音频
  playStaffAudio(e: any) {
    const audioUrl = e.currentTarget.dataset.audio
    console.log('播放员工音频:', audioUrl)

    if (audioUrl) {
      wx.downloadFile({
        url: audioUrl,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            const audioContext = wx.createInnerAudioContext()
            audioContext.src = res.tempFilePath
            audioContext.play()

            wx.showToast({
              title: '开始播放',
              icon: 'success',
              duration: 1500
            })
          } else {
            wx.showToast({
              title: '音频加载失败',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          console.error('下载音频失败:', err)
          wx.showToast({
            title: '播放失败',
            icon: 'none'
          })
        }
      })
    } else {
      wx.showToast({
        title: '暂无音频',
        icon: 'none'
      })
    }
  }
})
