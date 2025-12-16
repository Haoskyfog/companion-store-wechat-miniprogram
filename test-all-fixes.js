
// 测试所有修复的功能
const testAllFixes = async () => {
  console.log('=== 测试所有修复的功能 ===')
  
  try {
    // 1. 测试getUsers云函数（修复超时问题）
    console.log('1. 测试getUsers云函数...')
    const usersStart = Date.now()
    const usersRes = await wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 10
      }
    })
    const usersTime = Date.now() - usersStart
    
    console.log('getUsers响应时间:', usersTime, 'ms')
    console.log('getUsers结果:', usersRes.result)
    
    if (usersRes.result && usersRes.result.success) {
      console.log('✅ getUsers正常工作')
    } else {
      console.log('❌ getUsers仍有问题:', usersRes.result?.error)
    }
    
    // 2. 测试头像转换功能
    console.log('2. 测试头像转换...')
    const db = wx.cloud.database()
    const users = await db.collection('users').limit(5).get()
    
    const avatarUrls = []
    users.data.forEach(user => {
      if (user.avatar && user.avatar.startsWith('cloud://')) {
        avatarUrls.push(user.avatar)
      }
    })
    
    console.log('发现头像URL数量:', avatarUrls.length)
    
    if (avatarUrls.length > 0) {
      try {
        // 测试分批转换
        const batchSize = 3
        const batch = avatarUrls.slice(0, batchSize)
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: batch
        })
        
        console.log('头像转换结果:', tempRes)
        if (tempRes.fileList && tempRes.fileList.length > 0) {
          console.log('✅ 头像转换正常')
        } else {
          console.log('⚠️ 头像转换返回空结果')
        }
      } catch (err) {
        console.log('❌ 头像转换失败:', err)
      }
    }
    
    // 3. 测试auditReport云函数（修复参数问题）
    console.log('3. 测试auditReport参数修复...')
    
    // 先创建一个测试报备
    const staff = users.data.find(u => u.role === 'Staff')
    const boss = users.data.find(u => u.role === 'Boss')
    
    if (staff && boss) {
      const reportResult = await db.collection('reports').add({
        data: {
          bossId: boss._openid,
          staffId: staff._openid,
          game: '王者荣耀',
          duration: 1,
          date: new Date().toISOString().split('T')[0],
          platform: 'bixin',
          services: ['game'],
          remark: '功能测试报备',
          images: [],
          status: 'pending',
          createTime: db.serverDate()
        }
      })
      
      console.log('创建测试报备:', reportResult._id)
      
      // 测试审核
      const auditRes = await wx.cloud.callFunction({
        name: 'auditReport',
        data: {
          reportId: reportResult._id,
          action: 'approve',
          remark: '功能测试审核'
        }
      })
      
      console.log('审核结果:', auditRes.result)
      
      if (auditRes.result && auditRes.result.success) {
        console.log('✅ auditReport修复成功')
      } else {
        console.log('❌ auditReport仍有问题:', auditRes.result?.error)
      }
    } else {
      console.log('⚠️ 没有合适的用户进行审核测试')
    }
    
    wx.showToast({
      title: '测试完成',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('测试失败:', error)
    wx.showToast({
      title: '测试失败',
      icon: 'none'
    })
  }
}

testAllFixes()

