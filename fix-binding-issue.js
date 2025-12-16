// 修复绑定关系问题
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('=== 修复绑定关系问题 ===')

    // 1. 检查并创建测试用户
    console.log('1. 检查并创建测试用户...')
    const testStaff = {
      _openid: 'staff_test_chen1',
      nickname: '小陈1',
      userId: '20010',
      role: 'Staff'
    }

    const testBoss = {
      _openid: 'boss_test_holo',
      nickname: '团长Holo',
      userId: '10010',
      role: 'Boss',
      walletBalance: 100,
      totalConsumption: 0,
      vipLevel: 'VIP0'
    }

    const testAdmin = {
      _openid: 'admin_test_super',
      nickname: '超级管理员',
      userId: '00001',
      role: 'SuperAdmin'
    }

    const users = [testStaff, testBoss, testAdmin]

    for (const user of users) {
      const existing = await db.collection('users').where({
        _openid: user._openid
      }).get()

      if (existing.data.length === 0) {
        await db.collection('users').add({
          data: {
            ...user,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname}`,
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
            approvedReports: 0
          }
        })
        console.log(`✅ 创建用户: ${user.nickname}`)
      } else {
        console.log(`ℹ️ 用户已存在: ${user.nickname}`)
      }
    }

    // 2. 检查并创建绑定关系
    console.log('2. 检查并创建绑定关系...')
    const existingBinding = await db.collection('bindings').where({
      bossId: testBoss._openid,
      staffId: testStaff._openid,
      status: 'active'
    }).get()

    if (existingBinding.data.length === 0) {
      const binding = {
        bossId: testBoss._openid,
        staffId: testStaff._openid,
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        creatorId: testAdmin._openid
      }

      const result = await db.collection('bindings').add({
        data: binding
      })

      console.log(`✅ 创建绑定关系成功，ID: ${result._id}`)
    } else {
      console.log('ℹ️ 绑定关系已存在')
    }

    // 3. 验证修复结果
    console.log('3. 验证修复结果...')

    // 检查员工是否能获取到老板列表
    const staffBindings = await db.collection('bindings').where({
      staffId: testStaff._openid,
      status: 'active'
    }).get()

    console.log(`员工 ${testStaff.nickname} 有 ${staffBindings.data.length} 个绑定关系`)

    if (staffBindings.data.length > 0) {
      const bossPromises = staffBindings.data.map(binding =>
        db.collection('users').doc(binding.bossId).get()
      )

      const bossResults = await Promise.all(bossPromises)
      const validBosses = bossResults.filter(result => result.data)

      console.log('可选择的老板列表:')
      validBosses.forEach((result, index) => {
        const boss = result.data
        console.log(`  ${index + 1}. ${boss.nickname} (${boss.userId})`)
      })

      console.log('✅ 修复成功！员工现在可以选择老板创建订单了')
    } else {
      console.log('❌ 修复失败，员工仍然没有绑定关系')
    }

    return {
      success: true,
      message: '绑定关系修复完成'
    }

  } catch (error) {
    console.error('修复失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
