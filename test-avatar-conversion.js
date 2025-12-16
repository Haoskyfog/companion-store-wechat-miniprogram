
// 测试头像URL转换功能
const testAvatarConversion = async () => {
  console.log('=== 测试头像URL转换 ===')
  
  try {
    // 1. 获取一些用户信息
    const db = wx.cloud.database()
    const users = await db.collection('users').limit(5).get()
    
    console.log('用户数量:', users.data.length)
    
    // 2. 收集头像URL
    const avatarUrls = []
    users.data.forEach(user => {
      if (user.avatar && user.avatar.startsWith('cloud://')) {
        avatarUrls.push(user.avatar)
        console.log('找到头像URL:', user.avatar.substring(0, 50) + '...')
      }
    })
    
    console.log('需要转换的头像数量:', avatarUrls.length)
    
    if (avatarUrls.length === 0) {
      console.log('没有cloud://格式的头像URL')
      wx.showToast({
        title: '没有头像URL',
        icon: 'none'
      })
      return
    }
    
    // 3. 测试单个URL转换
    console.log('测试单个URL转换...')
    try {
      const singleRes = await wx.cloud.getTempFileURL({
        fileList: [avatarUrls[0]]
      })
      console.log('单个URL转换结果:', singleRes)
      
      if (singleRes.fileList && singleRes.fileList[0]) {
        console.log('临时URL:', singleRes.fileList[0].tempFileURL.substring(0, 50) + '...')
      }
    } catch (singleErr) {
      console.error('单个URL转换失败:', singleErr)
    }
    
    // 4. 测试批量转换
    console.log('测试批量转换...')
    try {
      const batchRes = await wx.cloud.getTempFileURL({
        fileList: avatarUrls.slice(0, 3) // 只测试前3个
      })
      console.log('批量转换结果:', batchRes)
      
      if (batchRes.fileList) {
        batchRes.fileList.forEach((item, index) => {
          console.log(`URL ${index + 1} 转换结果:`, {
            fileID: item.fileID.substring(0, 30) + '...',
            status: item.status,
            tempFileURL: item.tempFileURL ? item.tempFileURL.substring(0, 50) + '...' : 'null'
          })
        })
      }
    } catch (batchErr) {
      console.error('批量转换失败:', batchErr)
    }
    
    wx.showToast({
      title: '测试完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('测试失败:', error)
    wx.showToast({
      title: '测试失败',
      icon: 'none'
    })
  }
}

testAvatarConversion()

