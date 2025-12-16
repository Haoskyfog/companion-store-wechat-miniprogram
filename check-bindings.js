// 检查绑定关系数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('=== 检查绑定关系数据 ===')

    // 检查所有绑定关系
    const bindings = await db.collection('bindings').get()
    console.log(`总绑定关系数量: ${bindings.data.length}`)

    for (const binding of bindings.data) {
      console.log(`绑定ID: ${binding._id}`)
      console.log(`  老板ID: ${binding.bossId}`)
      console.log(`  员工ID: ${binding.staffId}`)
      console.log(`  状态: ${binding.status}`)
      console.log(`  创建时间: ${binding.createTime}`)
      console.log('---')
    }

    // 检查所有用户
    const users = await db.collection('users').get()
    console.log(`总用户数量: ${users.data.length}`)

    const bosses = users.data.filter(u => u.role === 'Boss')
    const staffs = users.data.filter(u => u.role === 'Staff')

    console.log(`老板数量: ${bosses.length}`)
    console.log(`员工数量: ${staffs.length}`)

    // 检查每个员工的绑定关系
    console.log('=== 员工绑定检查 ===')
    for (const staff of staffs) {
      console.log(`员工: ${staff.nickname} (${staff._openid})`)

      const staffBindings = await db.collection('bindings')
        .where({
          staffId: staff._openid,
          status: 'active'
        })
        .get()

      if (staffBindings.data.length === 0) {
        console.log('  ❌ 无绑定关系')
      } else {
        console.log(`  ✅ 有 ${staffBindings.data.length} 个绑定关系`)
        for (const binding of staffBindings.data) {
          const boss = bosses.find(b => b._openid === binding.bossId)
          console.log(`    - 老板: ${boss ? boss.nickname : '未知'} (${binding.bossId})`)
        }
      }
      console.log('---')
    }

    return {
      success: true,
      data: {
        totalBindings: bindings.data.length,
        totalUsers: users.data.length,
        bosses: bosses.length,
        staffs: staffs.length,
        bindings: bindings.data,
        users: users.data
      }
    }

  } catch (error) {
    console.error('检查失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
