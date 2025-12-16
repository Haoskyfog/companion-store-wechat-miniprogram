
// 完整的报备审核测试流程
const fullAuditTest = async () => {
  console.log('=== 完整的报备审核测试 ===')
  
  const db = wx.cloud.database()
  
  try {
    // 1. 创建测试报备（如果没有的话）
    console.log('1. 检查现有报备...')
    const existingReports = await wx.cloud.callFunction({
      name: 'getReports',
      data: { status: 'pending', page: 1, pageSize: 5 }
    })
    
    let testReport
    if (existingReports.result.success && existingReports.result.data.reports.length > 0) {
      testReport = existingReports.result.data.reports[0]
      console.log('使用现有报备:', testReport._id)
    } else {
      // 创建测试报备
      console.log('创建测试报备...')
      
      // 获取用户
      const users = await db.collection('users').get()
      const staff = users.data.find(u => u.role === 'Staff')
      const boss = users.data.find(u => u.role === 'Boss')
      
      if (!staff || !boss) {
        console.log('❌ 需要先创建员工和老板用户')
        return
      }
      
      const reportResult = await db.collection('reports').add({
        data: {
          bossId: boss._openid,
          staffId: staff._openid,
          game: '王者荣耀',
          duration: 2,
          date: new Date().toISOString().split('T')[0],
          platform: 'bixin',
          services: ['game', 'voice'],
          remark: '审核功能测试报备',
          images: [],
          status: 'pending',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      
      testReport = {
        _id: reportResult._id,
        staffInfo: { nickname: staff.nickname },
        bossInfo: { nickname: boss.nickname }
      }
      console.log('创建测试报备成功:', testReport._id)
    }
    
    // 2. 模拟审核通过
    console.log('2. 审核报备...')
    console.log('报备ID:', testReport._id)
    console.log('员工:', testReport.staffInfo?.nickname)
    console.log('老板:', testReport.bossInfo?.nickname)
    
    const auditResult = await wx.cloud.callFunction({
      name: 'auditReport',
      data: {
        reportId: testReport._id,
        action: 'approve',
        remark: '测试审核通过'
      }
    })
    
    console.log('审核API结果:', auditResult.result)
    
    if (auditResult.result.success) {
      console.log('✅ API调用成功')
      
      // 3. 验证数据库更新
      console.log('3. 验证数据库更新...')
      const updatedReport = await db.collection('reports').doc(testReport._id).get()
      
      if (updatedReport.data) {
        console.log('数据库中的状态:', updatedReport.data.status)
        console.log('审核时间:', updatedReport.data.auditTime)
        console.log('审核人:', updatedReport.data.auditorId)
        
        if (updatedReport.data.status === 'approved') {
          console.log('✅ 数据库状态正确更新')
        } else {
          console.log('❌ 数据库状态未更新')
        }
      } else {
        console.log('❌ 无法获取更新后的报备')
      }
      
      // 4. 验证API查询结果
      console.log('4. 验证API查询...')
      const approvedReports = await wx.cloud.callFunction({
        name: 'getReports',
        data: { status: 'approved', page: 1, pageSize: 5 }
      })
      
      if (approvedReports.result.success) {
        const found = approvedReports.result.data.reports.find(r => r._id === testReport._id)
        if (found) {
          console.log('✅ API查询结果正确')
        } else {
          console.log('❌ API查询结果不正确')
        }
      }
      
      wx.showToast({
        title: '审核测试完成',
        icon: 'success'
      })
      
    } else {
      console.log('❌ API调用失败:', auditResult.result.error)
      wx.showToast({
        title: '审核失败',
        icon: 'none'
      })
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error)
    wx.showToast({
      title: '测试出错',
      icon: 'none'
    })
  }
}

fullAuditTest()

