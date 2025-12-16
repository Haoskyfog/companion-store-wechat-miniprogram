// 老板端 - 推荐页
const pagePath = 'pages/boss/recommend/index';

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
    staffList: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      tags: string[];
      intro: string;
      color1: string;
      color2: string;
    }>,
    filteredStaffList: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
      tags: string[];
      intro: string;
      color1: string;
      color2: string;
    }>,
    searchKeyword: '',
    loading: true
  },

  onLoad() {
    this.loadRecommendContent()
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.syncRole && tabBar.syncRole('Boss');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }
  },

  // 加载推荐内容
  loadRecommendContent() {
    this.setData({ loading: true })

    // 直接加载员工列表
    this.loadStaffList()

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
          }
        } else {
          this.setData({ loading: false })
        }
      },
      fail: (err: any) => {
        console.error('加载推荐内容失败:', err)
        this.setData({ loading: false })
      }
    })
  },

  // 加载员工列表（显示所有员工）
  loadStaffList() {
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 200 // 获取更多员工
      },
      success: (res: any) => {
        wx.hideLoading()
        console.log('员工列表加载结果:', res)
        if (res.result && res.result.success) {
          const allStaffs = res.result.data.users || []
          console.log('员工数量:', allStaffs.length)

          // 显示所有员工
          const staffList = allStaffs.map((staff: any, index: number) => {
            const voiceSettings = staff.voiceSettings || {}

            return {
              _openid: staff._openid,
              nickname: staff.nickname || `员工${staff.userId || index + 1}`,
              userId: staff.userId || `ID${index + 1}`,
              avatar: staff.avatar,
              color1: this.getRandomColor1(index),
              color2: this.getRandomColor2(index),
              isComplete: !!(staff.avatar && staff.nickname && voiceSettings.introduction)
            }
          })

          console.log('处理后的员工列表:', staffList.length)
          this.setData({
            staffList,
            filteredStaffList: staffList,
            loading: false
          })
        } else {
          console.error('加载员工列表失败:', res.result)
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        console.error('加载员工列表失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
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
              const tags = []

              if (voiceSettings.voiceType) {
                tags.push(`${this.getVoiceTypeLabel(voiceSettings.voiceType)}音色`)
              }

              if (voiceSettings.lane) {
                tags.push(voiceSettings.lane)
              }

              if (tags.length === 0) {
                tags.push('王者荣耀')
              }

              return {
                _openid: staff._openid,
                nickname: staff.nickname,
                userId: staff.userId,
                avatar: staff.avatar,
                tags: tags,
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
        } else {
          this.setData({ loading: false })
        }
      },
      fail: (err: any) => {
        console.error('加载员工详情失败:', err)
        this.setData({ loading: false })
      }
    })
  },

  // 获取音色类型标签
  getVoiceTypeLabel(voiceType: string) {
    const voiceLabels: { [key: string]: string } = {
      '青年': '青年',
      '青叔': '青叔',
      '温青': '温青',
      '少女': '少女',
      '御姐': '御姐',
      '少御': '少御',
      '萝莉': '萝莉'
    }
    return voiceLabels[voiceType] || '青年'
  },

  // 获取随机颜色2
  getRandomColor2(index: number) {
    const colors = ['#c084fc', '#67e8f9', '#5eead4', '#eab308', '#a855f7', '#0891b2']
    return colors[index % colors.length]
  },

  // 搜索输入处理
  onSearchInput(e: any) {
    const keyword = e.detail.value.trim()
    this.setData({
      searchKeyword: keyword
    })
    this.filterStaffList(keyword)
  },

  // 筛选员工列表
  filterStaffList(keyword: string) {
    const { staffList } = this.data
    if (!keyword) {
      this.setData({
        filteredStaffList: staffList
      })
      return
    }

    const filtered = staffList.filter(staff =>
      staff.nickname && staff.nickname.toLowerCase().includes(keyword.toLowerCase())
    )

    this.setData({
      filteredStaffList: filtered
    })
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

})
