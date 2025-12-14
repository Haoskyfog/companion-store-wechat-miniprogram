// 员工端 - 主页
const pagePath = 'pages/staff/index/index';

Page({
  data: {
    banners: [] as Array<{
      _id: string;
      title: string;
      images: string[];
      order: number;
    }>,
    notices: [] as Array<{
      _id: string;
      title: string;
      content: string;
      createTime: string;
    }>,
    galleryList: [] as Array<{
      _id: string;
      title: string;
      images: string[];
      order: number;
    }>,
    loading: true
  },

  onLoad() {
    this.loadContent()
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.syncRole && tabBar.syncRole('Staff');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }
  },

  // 加载内容
  loadContent() {
    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'getContent',
      success: (res: any) => {
        wx.hideLoading()

        if (res.result?.success) {
          const data = res.result.data

          this.setData({
            banners: data.banner || [],
            galleryList: data.gallery || [],
            notices: (data.notice || []).map((n: any) => ({
              ...n,
              createTime: this.formatTime(n.createTime)
            })),
            loading: false
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 查看相册详情
  viewGallery(e: any) {
    const gallery = e.currentTarget.dataset.gallery
    if (gallery.images && gallery.images.length > 0) {
      wx.previewImage({
        current: gallery.images[0],
        urls: gallery.images
      })
    }
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`

    return date.toLocaleDateString()
  }
})
