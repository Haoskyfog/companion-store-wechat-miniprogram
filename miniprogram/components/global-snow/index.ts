// 全局雪花效果组件
Component({
  data: {
    snowflakes: [] as Array<{
      id: number;
      left: number;
      duration: number;
      delay: number;
      size: number;
    }>
  },

  lifetimes: {
    attached() {
      this.initSnowflakes()
    }
  },

  methods: {
    // 初始化雪花
    initSnowflakes() {
      const snowflakes = []
      const snowflakeCount = 30 // 全局雪花数量稍多一些

      // 获取屏幕宽度
      const systemInfo = wx.getSystemInfoSync()
      const screenWidth = systemInfo.windowWidth

      for (let i = 0; i < snowflakeCount; i++) {
        snowflakes.push({
          id: i,
          left: Math.random() * screenWidth, // 随机水平位置
          duration: 10 + Math.random() * 8, // 10-18秒随机持续时间
          delay: Math.random() * 10, // 0-10秒随机延迟
          size: 12 + Math.random() * 8 // 12-20rpx随机大小
        })
      }

      this.setData({
        snowflakes: snowflakes
      })
    }
  }
})