// 调试绑定关系问题
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('=== 调试绑定关系问题 ===')

    // 1. 检查所有绑定关系
    console.log('1. 检查所有绑定关系...')
    const allBindings = await db.collection('bindings').get()
    console.log(`数据库中有 ${allBindings.data.length} 个绑定关系`)

    allBindings.data.forEach((binding, index) => {
      console.log(`${index + 1}. 绑定ID: ${binding._id}`)
      console.log(`   bossId: ${binding.bossId}`)
      console.log(`   staffId: ${binding.staffId}`)
      console.log(`   status: ${binding.status}`)
      console.log(`   createTime: ${binding.createTime}`)
      console.log('---')
    })

    // 2. 检查测试用户是否存在
    console.log('2. 检查测试用户...')
    const testStaff = await db.collection('users').where({
      _openid: 'staff_test_chen1'
    }).get()

    const testBoss = await db.collection('users').where({
      _openid: 'boss_test_holo'
    }).get()

    console.log(`员工用户存在: ${testStaff.data.length > 0}`)
    if (testStaff.data.length > 0) {
      console.log(`  员工信息: ${testStaff.data[0].nickname} (${testStaff.data[0]._openid})`)
    }

    console.log(`老板用户存在: ${testBoss.data.length > 0}`)
    if (testBoss.data.length > 0) {
      console.log(`  老板信息: ${testBoss.data[0].nickname} (${testBoss.data[0]._openid})`)
    }

    // 3. 模拟员工查询绑定关系的逻辑
    console.log('3. 模拟员工查询绑定关系...')
    if (testStaff.data.length > 0) {
      const staffId = testStaff.data[0]._openid
      console.log(`员工ID: ${staffId}`)

      const bindings = await db.collection('bindings').where({
        staffId: staffId,
        status: 'active'
      }).get()

      console.log(`为该员工找到 ${bindings.data.length} 个绑定关系`)

      if (bindings.data.length > 0) {
        console.log('绑定关系详情:')
        bindings.data.forEach((binding, index) => {
          console.log(`  ${index + 1}. bossId: ${binding.bossId}, status: ${binding.status}`)
        })

        // 获取老板信息
        console.log('获取老板信息...')
        const bossPromises = bindings.data.map(binding =>
          db.collection('users').doc(binding.bossId).get()
        )

        const bossResults = await Promise.all(bossPromises)
        const validBosses = bossResults.filter(result => result.data)

        console.log(`成功获取 ${validBosses.length} 个老板信息:`)
        validBosses.forEach((result, index) => {
          const boss = result.data
          console.log(`  ${index + 1}. ${boss.nickname} (${boss._openid})`)
        })

      } else {
        console.log('❌ 没有找到绑定关系 - 这就是问题所在！')
      }
    }

    return {
      success: true,
      data: {
        totalBindings: allBindings.data.length,
        staffExists: testStaff.data.length > 0,
        bossExists: testBoss.data.length > 0,
        staffBindings: testStaff.data.length > 0 ?
          (await db.collection('bindings').where({
            staffId: testStaff.data[0]._openid,
            status: 'active'
          }).get()).data.length : 0
      }
    }

  } catch (error) {
    console.error('调试失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
