// 绑定老板和员工云函数
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
        error: '只有管理员可以绑定关系'
      }
    }

    // 检查是否已存在绑定
    const existingBinding = await db.collection('bindings').where({
      bossId: event.bossId,
      staffId: event.staffId,
      status: 'active'
    }).get()

    if (existingBinding.data.length > 0) {
      return {
        success: false,
        error: '绑定关系已存在'
      }
    }

    // 创建绑定关系
    const binding = {
      bossId: event.bossId,
      staffId: event.staffId,
      status: 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      creatorId: openid
    }

    const result = await db.collection('bindings').add({
      data: binding
    })

    return {
      success: true,
      data: {
        _id: result._id,
        ...binding
      }
    }
  } catch (err) {
    console.error('绑定失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
