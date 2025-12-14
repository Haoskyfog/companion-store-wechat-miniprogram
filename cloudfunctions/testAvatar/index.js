// 测试头像云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const { userId } = event

    // 查询指定用户的头像信息
    const userResult = await db.collection('users').where({
      _openid: userId || openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const user = userResult.data[0]
    const avatar = user.avatar

    console.log('用户头像信息:', {
      nickname: user.nickname,
      avatar: avatar,
      avatarType: typeof avatar,
      avatarLength: avatar ? avatar.length : 0,
      containsCloud: avatar && avatar.includes('cloud://')
    })

    // 如果有头像，尝试获取临时URL
    if (avatar && avatar.includes('cloud://')) {
      try {
        const tempUrlRes = await cloud.getTempFileURL({
          fileList: [avatar]
        })

        console.log('getTempFileURL结果:', tempUrlRes)

        return {
          success: true,
          data: {
            user: {
              nickname: user.nickname,
              avatar: avatar
            },
            tempUrlResult: tempUrlRes
          }
        }
      } catch (error) {
        console.error('获取临时URL失败:', error)
        return {
          success: false,
          error: '获取临时URL失败: ' + error.message,
          avatar: avatar
        }
      }
    } else {
      return {
        success: true,
        data: {
          user: {
            nickname: user.nickname,
            avatar: avatar
          },
          message: '用户没有设置头像或头像不是云文件ID'
        }
      }
    }
  } catch (err) {
    console.error('测试头像失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}




