// 清理重复用户记录脚本
// 根据 _openid 删除重复记录，只保留一条
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-7g62s1bob33a0a2c' // 请根据实际情况修改环境ID
})

const db = cloud.database()

async function cleanupDuplicateUsers() {
  console.log('=== 开始清理重复用户记录 ===\n')

  try {
    // 1. 获取所有用户
    console.log('步骤1: 获取所有用户记录...')
    const allUsers = await db.collection('users').get()
    console.log(`找到 ${allUsers.data.length} 条用户记录\n`)

    // 2. 按 _openid 分组
    console.log('步骤2: 检测重复记录...')
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
      console.log('✅ 没有发现重复记录！\n')
      return {
        success: true,
        message: '没有重复记录',
        deleted: 0
      }
    }

    console.log(`⚠️  发现 ${duplicateOpenids.length} 个用户有重复记录\n`)

    // 4. 处理每个重复的 openid
    let totalDeleted = 0

    for (const openid of duplicateOpenids) {
      const users = openidMap[openid]
      console.log(`\n处理重复用户: ${openid}`)
      console.log(`  共有 ${users.length} 条记录：`)
      
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user._id}`)
        console.log(`     昵称: ${user.nickname || '未设置'}`)
        console.log(`     角色: ${user.role}`)
        console.log(`     创建时间: ${user.createTime}`)
      })

      // 5. 选择要保留的记录（优先级规则）
      const toKeep = selectUserToKeep(users)
      console.log(`\n  ✅ 保留记录: ${toKeep._id} (${toKeep.nickname || '未设置'} - ${toKeep.role})`)

      // 6. 删除其他记录
      const toDelete = users.filter(user => user._id !== toKeep._id)
      
      for (const user of toDelete) {
        try {
          await db.collection('users').doc(user._id).remove()
          console.log(`  ❌ 已删除: ${user._id} (${user.nickname || '未设置'})`)
          totalDeleted++
        } catch (err) {
          console.error(`  ❌ 删除失败: ${user._id}, 错误:`, err.message)
        }
      }
    }

    console.log(`\n=== 清理完成 ===`)
    console.log(`✅ 成功删除 ${totalDeleted} 条重复记录`)
    console.log(`✅ 保留 ${duplicateOpenids.length} 条有效记录\n`)

    return {
      success: true,
      message: `成功删除 ${totalDeleted} 条重复记录`,
      deleted: totalDeleted,
      duplicateCount: duplicateOpenids.length
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
// 优先级：角色权重 > 创建时间（最新）
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

// 导出云函数接口
exports.main = async (event, context) => {
  return await cleanupDuplicateUsers()
}

// 如果直接运行脚本（非云函数）
if (require.main === module) {
  cleanupDuplicateUsers().then(result => {
    console.log('\n最终结果:', result)
    process.exit(0)
  }).catch(err => {
    console.error('脚本执行失败:', err)
    process.exit(1)
  })
}

