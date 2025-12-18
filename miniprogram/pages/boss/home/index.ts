// 老板端 - 主页
const pagePath = 'pages/boss/home/index';

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
    loading: true,
    // 新订单弹窗
    showOrderPopup: false,
    newOrder: null as any,
    lastCheckedOrderId: ''
  },

  onLoad() {
    this.loadContent()
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
    
    // 检查新订单
    this.checkNewOrders()
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

  // 图片加载错误处理
  onImageError(e: any) {
    console.error('图片加载失败:', e)
    const dataset = e.currentTarget.dataset
    console.error('失败的图片信息:', {
      src: e.currentTarget.src,
      dataset: dataset,
      detail: e.detail
    })
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
  },

  // 检查新订单
  checkNewOrders() {
    wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        status: 'pending',
        page: 1,
        pageSize: 1
      },
      success: (res: any) => {
        if (res.result?.success && res.result.data?.orders?.length > 0) {
          const latestOrder = res.result.data.orders[0]
          const lastCheckedId = wx.getStorageSync('lastCheckedOrderId') || ''
          
          // 如果有新订单且不是已查看过的
          if (latestOrder._id !== lastCheckedId) {
            this.setData({
              showOrderPopup: true,
              newOrder: latestOrder
            })
          }
        }
      }
    })
  },

  // 关闭订单弹窗
  closeOrderPopup() {
    if (this.data.newOrder) {
      wx.setStorageSync('lastCheckedOrderId', this.data.newOrder._id)
    }
    this.setData({
      showOrderPopup: false,
      newOrder: null
    })
  },

  // 查看订单详情
  viewOrderDetail() {
    if (this.data.newOrder) {
      wx.setStorageSync('lastCheckedOrderId', this.data.newOrder._id)
      this.setData({
        showOrderPopup: false,
        newOrder: null
      })
      wx.navigateTo({
        url: '/pages/boss/orders/index'
      })
    }
  }
})
