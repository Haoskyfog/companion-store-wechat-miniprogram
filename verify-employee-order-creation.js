// 验证员工创建订单时老板选择的完整流程
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('=== 验证员工创建订单流程 ===')

    const staffOpenid = 'staff_test_chen1'

    // 模拟员工创建订单页面的完整流程

    console.log('1. 员工获取自己的信息...')
    const userResult = await db.collection('users').where({
      _openid: staffOpenid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '员工用户不存在，请先创建测试用户'
      }
    }

    const userInfo = userResult.data[0]
    console.log(`员工信息: ${userInfo.nickname} (${userInfo.role})`)

    // 2. 查询绑定关系
    console.log('2. 查询员工的绑定关系...')
    const bindingRes = await db.collection('bindings')
      .where({
        staffId: userInfo._openid,
        status: 'active'
      })
      .get()

    console.log(`找到 ${bindingRes.data.length} 个绑定关系`)

    if (bindingRes.data.length === 0) {
      console.log('❌ 问题：员工没有绑定关系')
      console.log('解决方案：在管理员端绑定员工和老板')

      // 检查是否有任何绑定关系（包括非active的）
      const allBindings = await db.collection('bindings').where({
        staffId: userInfo._openid
      }).get()

      console.log(`员工总共有 ${allBindings.data.length} 个绑定关系（包括非active）`)
      allBindings.data.forEach((binding, index) => {
        console.log(`  ${index + 1}. bossId: ${binding.bossId}, status: ${binding.status}`)
      })

      return {
        success: false,
        error: '员工没有active状态的绑定关系',
        debugInfo: {
          staffId: userInfo._openid,
          totalBindings: allBindings.data.length,
          activeBindings: bindingRes.data.length
        }
      }
    }

    // 3. 获取老板信息
    console.log('3. 获取老板详细信息...')
    const bossPromises = bindingRes.data.map((binding) => {
      console.log(`获取老板信息: ${binding.bossId}`)
      return db.collection('users').doc(binding.bossId).get()
    })

    const bossResults = await Promise.all(bossPromises)

    // 过滤出有效的老板信息
    const validBossResults = bossResults.filter(result => {
      if (!result.data) {
        console.log('❌ 老板信息获取失败')
        return false
      }
      return true
    })

    if (validBossResults.length === 0) {
      console.log('❌ 问题：无法获取任何老板信息')
      return {
        success: false,
        error: '绑定关系中的老板用户不存在',
        debugInfo: {
          bindingCount: bindingRes.data.length,
          bossResults: bossResults.map(r => ({ success: !!r.data, bossId: r.data?._openid }))
        }
      }
    }

    // 4. 构建老板列表（模拟前端逻辑）
    const bossList = validBossResults.map(result => result.data)
    console.log('4. 构建老板列表...')
    console.log('可选择的老板:')
    bossList.forEach((boss, index) => {
      console.log(`  ${index + 1}. ${boss.nickname} (ID: ${boss.userId}) - ${boss._openid}`)
    })

    // 5. 验证创建订单的逻辑
    console.log('5. 验证创建订单逻辑...')
    if (bossList.length > 0) {
      const selectedBoss = bossList[0] // 默认选择第一个
      console.log(`选择老板: ${selectedBoss.nickname}`)

      // 模拟创建订单
      const orderData = {
        _openid: userInfo._openid,
        staffId: userInfo._openid,
        bossId: selectedBoss._openid,
        game: '王者荣耀',
        duration: 2,
        date: new Date().toISOString().split('T')[0],
        position: '中路',
        remark: '测试订单',
        services: ['rank', 'voice'],
        amount: 20,
        paymentStatus: 'unpaid',
        complaintStatus: 'none',
        status: 'pending',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }

      const orderResult = await db.collection('orders').add({
        data: orderData
      })

      console.log(`✅ 订单创建成功，订单ID: ${orderResult._id}`)
      console.log('✅ 员工创建订单流程验证通过！')

      return {
        success: true,
        message: '员工创建订单流程验证通过',
        data: {
          bossList: bossList.map(b => ({
            nickname: b.nickname,
            userId: b.userId,
            _openid: b._openid
          })),
          createdOrderId: orderResult._id
        }
      }
    } else {
      console.log('❌ 没有可选择的老板')
      return {
        success: false,
        error: '没有可选择的老板'
      }
    }

  } catch (error) {
    console.error('验证失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
