// 测试员工获取老板列表的逻辑
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { staffOpenid } = event

    console.log('=== 测试员工获取老板列表 ===')
    console.log(`员工OpenID: ${staffOpenid}`)

    // 模拟员工创建订单页面的逻辑

    // 1. 获取员工信息
    console.log('1. 获取员工信息...')
    const userResult = await db.collection('users').where({
      _openid: staffOpenid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '员工用户不存在'
      }
    }

    const userInfo = userResult.data[0]
    console.log(`员工信息: ${userInfo.nickname} (${userInfo._openid})`)

    // 2. 查询绑定关系
    console.log('2. 查询绑定关系...')
    const bindingQuery = {
      staffId: userInfo._openid,
      status: 'active'
    }
    console.log('查询条件:', bindingQuery)

    const bindingRes = await db.collection('bindings')
      .where(bindingQuery)
      .get()

    console.log(`找到 ${bindingRes.data.length} 个绑定关系`)

    if (bindingRes.data.length > 0) {
      // 3. 获取老板信息
      console.log('3. 获取老板信息...')
      const bossPromises = bindingRes.data.map((binding) => {
        console.log(`查询老板: ${binding.bossId}`)
        return db.collection('users').doc(binding.bossId).get()
      })

      const bossResults = await Promise.all(bossPromises)
      const bossList = bossResults
        .filter(result => result.data)
        .map(result => result.data)

      console.log(`成功获取 ${bossList.length} 个老板信息`)
      bossList.forEach(boss => {
        console.log(`  - ${boss.nickname} (${boss._openid})`)
      })

      return {
        success: true,
        data: {
          bossList,
          bindingCount: bindingRes.data.length
        }
      }
    } else {
      console.log('❌ 没有找到绑定关系')
      return {
        success: false,
        error: '没有找到绑定关系',
        data: {
          bossList: [],
          bindingCount: 0
        }
      }
    }

  } catch (error) {
    console.error('测试失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
