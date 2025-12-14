// 更新用户角色云函数
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
        error: '只有管理员可以修改角色'
      }
    }

    // 获取目标用户信息
    const targetUserResult = await db.collection('users').doc(event.userId).get()

    if (!targetUserResult.data) {
      return {
        success: false,
        error: '目标用户不存在'
      }
    }

    const operatorRole = userResult.data[0].role
    const targetUserRole = targetUserResult.data.role

    // 权限检查规则（核心安全逻辑）
    if (operatorRole === 'SuperAdmin') {
      // ✅ SuperAdmin可以修改任何用户，可以设置任何角色
      // 无需额外检查
    } else if (operatorRole === 'Admin') {
      // ❌ Admin禁止修改SuperAdmin
      if (targetUserRole === 'SuperAdmin') {
        return {
          success: false,
          error: '普通管理员不能修改超级管理员'
        }
      }

      // ❌ Admin禁止把任何用户设置为Admin或SuperAdmin
      if (event.newRole === 'Admin' || event.newRole === 'SuperAdmin') {
        return {
          success: false,
          error: '普通管理员不能设置管理员角色'
        }
      }

      // ✅ Admin只允许在Boss/Staff之间修改
      // （通过上面的检查，确保目标不是SuperAdmin，新角色不是Admin/SuperAdmin）
    } else {
      // ❌ 其他角色不允许修改任何用户
      return {
        success: false,
        error: '权限不足'
      }
    }

    // 更新用户角色
    await db.collection('users').doc(event.userId).update({
      data: {
        role: event.newRole,
        updateTime: db.serverDate()
      }
    })

    return {
      success: true
    }
  } catch (err) {
    console.error('更新角色失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
