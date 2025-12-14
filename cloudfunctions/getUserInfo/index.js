// 获取用户信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户信息
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      // 新用户，创建默认记录
      const newUser = {
        _openid: openid,
        role: 'Boss', // 默认角色为老板
        nickname: '',
        avatar: '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      await db.collection('users').add({
        data: newUser
      })

      return {
        success: true,
        data: newUser
      }
    }

    return {
      success: true,
      data: userResult.data[0]
    }
  } catch (err) {
    console.error('获取用户信息失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
