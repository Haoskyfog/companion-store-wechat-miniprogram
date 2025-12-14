// 员工端 - 主页
const pagePath = 'pages/staff/home/index';

Page({
  onLoad() {
    // 页面加载
  },

  onShow() {
    // 设置 TabBar 选中状态
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      // 确保TabBar显示正确的角色配置
      tabBar.syncRole && tabBar.syncRole('Staff');
      tabBar.setSelected && tabBar.setSelected(pagePath);
    }
  },

  // 创建订单
  onCreateOrder() {
    wx.navigateTo({
      url: '/pages/staff/create-order/index'
    })
  },

  // 提交报备
  onSubmitReport() {
    wx.navigateTo({
      url: '/pages/staff/report/index'
    })
  },

  // 查看排行榜
  onViewRanking() {
    wx.navigateTo({
      url: '/pages/staff/ranking/index'
    })
  },

  // 查看个人资料
  onViewProfile() {
    wx.navigateTo({
      url: '/pages/staff/profile/index'
    })
  },

  // 查看我的订单
  onViewOrders() {
    wx.navigateTo({
      url: '/pages/staff/orders/index'
    })
  },

  // 查看报备记录
  onViewReports() {
    wx.navigateTo({
      url: '/pages/staff/reports/index'
    })
  }
})
