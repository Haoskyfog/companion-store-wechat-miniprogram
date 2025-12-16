// 清理重复用户记录云函数
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
        error: '只有管理员可以执行此操作'
      }
    }

    console.log('=== 开始清理重复用户记录 ===')

    // 1. 获取所有用户
    const allUsers = await db.collection('users').get()
    console.log(`获取到 ${allUsers.data.length} 条用户记录`)

    // 2. 按 _openid 分组
    const openidMap = {}
    
    allUsers.data.forEach(user => {
      if (!openidMap[user._openid]) {
        openidMap[user._openid] = []
      }
      openidMap[user._openid].push(user)
    })

    // 3. 找出重复的 openid
    const duplicateOpenids = Object.keys(openidMap).filter(
      openid => openidMap[openid].length > 1
    )

    if (duplicateOpenids.length === 0) {
      console.log('✅ 没有发现重复记录')
      return {
        success: true,
        message: '没有发现重复记录',
        deleted: 0,
        duplicateCount: 0
      }
    }

    console.log(`发现 ${duplicateOpenids.length} 个用户有重复记录`)

    // 4. 处理每个重复的 openid
    let totalDeleted = 0
    const deletedRecords = []

    for (const openid of duplicateOpenids) {
      const users = openidMap[openid]
      console.log(`处理用户: ${openid}, 共 ${users.length} 条记录`)
      
      // 选择要保留的记录
      const toKeep = selectUserToKeep(users)
      console.log(`保留: ${toKeep._id} (${toKeep.nickname || '未设置'} - ${toKeep.role})`)

      // 删除其他记录
      const toDelete = users.filter(user => user._id !== toKeep._id)
      
      for (const user of toDelete) {
        try {
          await db.collection('users').doc(user._id).remove()
          console.log(`已删除: ${user._id}`)
          totalDeleted++
          deletedRecords.push({
            _id: user._id,
            _openid: user._openid,
            nickname: user.nickname,
            role: user.role
          })
        } catch (err) {
          console.error(`删除失败: ${user._id}`, err)
        }
      }
    }

    console.log(`=== 清理完成 ===`)
    console.log(`删除了 ${totalDeleted} 条重复记录`)

    return {
      success: true,
      message: `成功删除 ${totalDeleted} 条重复记录`,
      deleted: totalDeleted,
      duplicateCount: duplicateOpenids.length,
      deletedRecords: deletedRecords
    }

  } catch (err) {
    console.error('清理失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 选择要保留的用户记录
function selectUserToKeep(users) {
  // 角色权重
  const roleWeight = {
    'SuperAdmin': 4,
    'Admin': 3,
    'Staff': 2,
    'Boss': 1
  }

  // 按优先级排序
  users.sort((a, b) => {
    // 1. 优先保留角色权重高的
    const weightA = roleWeight[a.role] || 0
    const weightB = roleWeight[b.role] || 0
    if (weightA !== weightB) {
      return weightB - weightA
    }

    // 2. 优先保留有昵称的
    if (a.nickname && !b.nickname) return -1
    if (!a.nickname && b.nickname) return 1

    // 3. 优先保留创建时间晚的（最新的）
    const timeA = new Date(a.createTime).getTime()
    const timeB = new Date(b.createTime).getTime()
    return timeB - timeA
  })

  return users[0]
}

