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
    // 循环重试机制，最多重试3次
    for (let attempt = 1; attempt <= 3; attempt++) {
      // 查询用户信息
      const userResult = await db.collection('users').where({
        _openid: openid
      }).get()

      if (userResult.data.length > 0) {
        // 用户已存在，直接返回
        return {
          success: true,
          data: userResult.data[0]
        }
      }

      // 用户不存在，尝试创建
      console.log(`第${attempt}次尝试创建用户:`, openid)

      try {
        const newUser = {
          _openid: openid,
          role: 'Boss', // 默认角色为老板
          nickname: '',
          avatar: '',
          userId: '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }

        await db.collection('users').add({
          data: newUser
        })

        console.log('成功创建新用户')
        return {
          success: true,
          data: newUser
        }

      } catch (createError) {
        // 创建失败，可能是并发冲突
        console.log(`第${attempt}次创建失败:`, createError.message)

        // 如果不是最后一次尝试，等待一下再重试
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 等待100ms
          continue
        }

        // 最后一次尝试失败，返回错误
        throw createError
      }
    }

    // 如果所有重试都失败了，返回错误
    throw new Error('创建用户失败，已重试3次')

  } catch (err) {
    console.error('获取用户信息失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
