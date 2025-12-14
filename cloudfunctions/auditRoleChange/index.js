// 审核更换直属申请云函数
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
        error: '只有管理员可以审核更换申请'
      }
    }

    // 获取申请详情
    const requestResult = await db.collection('roleChangeRequests').doc(event.requestId).get()

    if (!requestResult.data) {
      return {
        success: false,
        error: '申请不存在'
      }
    }

    const request = requestResult.data

    // 只能审核待审核的申请
    if (request.status !== 'pending') {
      return {
        success: false,
        error: '申请状态不允许操作'
      }
    }

    const newStatus = event.action === 'approve' ? 'approved' : 'rejected'

    // 更新申请状态
    await db.collection('roleChangeRequests').doc(event.requestId).update({
      data: {
        status: newStatus,
        auditTime: db.serverDate(),
        auditorId: openid,
        auditRemark: event.remark || '',
        updateTime: db.serverDate()
      }
    })

    // 如果审核通过，执行绑定关系变更
    if (newStatus === 'approved') {
      // 先解除当前绑定
      await db.collection('bindings').where({
        bossId: request.bossId,
        staffId: request.currentStaffId,
        status: 'active'
      }).update({
        data: {
          status: 'inactive',
          updateTime: db.serverDate()
        }
      })

      // 检查是否已有新绑定关系，如果没有则创建
      const existingBinding = await db.collection('bindings').where({
        bossId: request.bossId,
        staffId: request.targetStaffId,
        status: 'active'
      }).get()

      if (existingBinding.data.length === 0) {
        await db.collection('bindings').add({
          data: {
            bossId: request.bossId,
            staffId: request.targetStaffId,
            status: 'active',
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
            creatorId: openid
          }
        })
      }
    }

    return {
      success: true,
      data: {
        requestId: event.requestId,
        status: newStatus
      }
    }
  } catch (err) {
    console.error('审核更换申请失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}