// 审核报备云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证管理员权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有管理员可以审核'
      }
    }

    // 转换action为status
    const status = event.action === 'approve' ? 'approved' : 'rejected'

    console.log('=== 审核报备调试 ===')
    console.log('报备ID:', event.reportId)
    console.log('审核动作:', event.action)
    console.log('目标状态:', status)
    
    // 更新报备状态
    const updateResult = await db.collection('reports').doc(event.reportId).update({
      data: {
        status: status, // 'approved' 或 'rejected'
        auditTime: db.serverDate(),
        auditorId: openid,
        auditRemark: event.remark || '',
        updateTime: db.serverDate()
      }
    })
    
    console.log('更新结果:', JSON.stringify(updateResult))
    
    // 验证更新是否成功
    const verifyResult = await db.collection('reports').doc(event.reportId).get()
    console.log('验证状态:', verifyResult.data ? verifyResult.data.status : 'null')
    
    // 输出报备的金额信息
    if (verifyResult.data) {
      console.log('报备金额信息:', {
        报备ID: verifyResult.data._id,
        金额: verifyResult.data.amount,
        金额类型: typeof verifyResult.data.amount,
        状态: verifyResult.data.status,
        员工ID: verifyResult.data.staffId,
        老板ID: verifyResult.data.bossId
      })
    }
    
    console.log('=== 调试结束 ===')

    // 如果审核通过，增加员工的报备通过数
    if (status === 'approved') {
      // 获取报备信息以获取员工ID
      const reportResult = await db.collection('reports').doc(event.reportId).get()
      if (reportResult.data) {
        const staffId = reportResult.data.staffId
        // 增加员工的报备通过数
        await db.collection('users').where({
          _openid: staffId
        }).update({
          data: {
            approvedReports: db.command.inc(1),
            updateTime: db.serverDate()
          }
        })
      }
    }

    return {
      success: true
    }
  } catch (err) {
    console.error('审核失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
