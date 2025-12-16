
// 测试报备审核功能
const testAuditReport = async () => {
  console.log('=== 测试报备审核功能 ===')
  
  try {
    // 1. 先检查是否有待审核的报备
    const reportsRes = await wx.cloud.callFunction({
      name: 'getReports',
      data: { status: 'pending', page: 1, pageSize: 5 }
    })
    
    if (!reportsRes.result.success || reportsRes.result.data.reports.length === 0) {
      console.log('❌ 没有待审核的报备，请先创建测试报备')
      wx.showToast({
        title: '没有待审核报备',
        icon: 'none'
      })
      return
    }
    
    const report = reportsRes.result.data.reports[0]
    console.log('找到待审核报备:', {
      id: report._id,
      staff: report.staffInfo?.nickname,
      status: report.status
    })
    
    // 2. 测试审核通过
    console.log('测试审核通过...')
    const auditRes = await wx.cloud.callFunction({
      name: 'auditReport',
      data: {
        reportId: report._id,
        action: 'approve',
        remark: '测试审核通过'
      }
    })
    
    console.log('审核结果:', auditRes.result)
    
    if (auditRes.result.success) {
      console.log('✅ 审核通过成功')
      
      // 3. 验证状态是否更新
      const verifyRes = await wx.cloud.callFunction({
        name: 'getReports',
        data: { status: 'approved', page: 1, pageSize: 5 }
      })
      
      if (verifyRes.result.success) {
        const updatedReport = verifyRes.result.data.reports.find(r => r._id === report._id)
        if (updatedReport && updatedReport.status === 'approved') {
          console.log('✅ 报备状态已正确更新为approved')
        } else {
          console.log('❌ 报备状态未正确更新')
        }
      }
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } else {
      console.log('❌ 审核失败:', auditRes.result.error)
      wx.showToast({
        title: '审核失败',
        icon: 'none'
      })
    }
    
  } catch (error) {
    console.error('测试失败:', error)
    wx.showToast({
      title: '测试失败',
      icon: 'none'
    })
  }
}

testAuditReport()

