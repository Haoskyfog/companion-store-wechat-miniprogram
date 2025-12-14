// 提交更换直属申请云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户角色（必须是老板）
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || userResult.data[0].role !== 'Boss') {
      return {
        success: false,
        error: '只有老板可以提交更换直属申请'
      }
    }

    // 检查当前绑定关系
    const currentBinding = await db.collection('bindings').where({
      bossId: openid,
      staffId: event.currentStaffId,
      status: 'active'
    }).get()

    if (currentBinding.data.length === 0) {
      return {
        success: false,
        error: '当前直属员工绑定关系不存在'
      }
    }

    // 检查目标员工是否存在且不是当前员工
    if (event.currentStaffId === event.targetStaffId) {
      return {
        success: false,
        error: '目标员工不能是当前员工'
      }
    }

    // 创建更换申请
    const request = {
      _openid: openid,
      bossId: openid,
      currentStaffId: event.currentStaffId,
      targetStaffId: event.targetStaffId,
      reason: event.reason || '',
      status: 'pending', // 待审核
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('roleChangeRequests').add({
      data: request
    })

    return {
      success: true,
      data: {
        _id: result._id,
        ...request
      }
    }
  } catch (err) {
    console.error('提交更换申请失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}