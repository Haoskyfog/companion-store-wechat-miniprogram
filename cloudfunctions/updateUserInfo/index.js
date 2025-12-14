// 更新用户信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const { nickname, avatar, userId, voiceSettings } = event

    // 验证参数（只有在提供时才验证）
    if (nickname !== undefined && (!nickname || nickname.trim() === '')) {
      return {
        success: false,
        error: '昵称不能为空'
      }
    }

    if (userId !== undefined && (!userId || userId.trim() === '')) {
      return {
        success: false,
        error: '用户ID不能为空'
      }
    }

    // 更新用户信息
    const updateData = {
      updateTime: db.serverDate()
    }

    // 更新基本信息（如果提供了）
    if (nickname && nickname.trim() !== '') {
      updateData.nickname = nickname.trim()
    }

    if (userId && userId.trim() !== '') {
      // 检查用户ID是否已被使用（排除自己）
      const existingUser = await db.collection('users')
        .where({
          userId: userId.trim(),
          _openid: db.command.neq(openid) // 不等于当前用户
        })
        .get()

      if (existingUser.data.length > 0) {
        return {
          success: false,
          error: '用户ID已被使用，请选择其他ID'
        }
      }

      updateData.userId = userId.trim()
    }

    // 只有在提供了头像时才更新头像
    if (avatar && avatar.trim() !== '') {
      updateData.avatar = avatar.trim()
    }

    // 更新语音设置
    if (voiceSettings) {
      updateData.voiceSettings = voiceSettings
    }

    await db.collection('users').where({
      _openid: openid
    }).update({
      data: updateData
    })

    return {
      success: true,
      data: updateData
    }
  } catch (err) {
    console.error('更新用户信息失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
