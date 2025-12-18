// 测试排行榜云函数是否正常工作
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

async function testRankingsFunction() {
  console.log('=== 测试排行榜云函数 ===\n')

  try {
    // 测试员工排行榜
    console.log('测试员工排行榜...')
    const staffResult = await cloud.callFunction({
      name: 'getRankings',
      data: {
        type: 'staff'
      }
    })

    if (staffResult.result && staffResult.result.success) {
      console.log('✅ 员工排行榜正常')
      console.log(`   返回 ${staffResult.result.data.rankings.length} 个员工`)
    } else {
      console.log('❌ 员工排行榜失败:', staffResult.result?.error)
    }

    // 测试直属排行榜
    console.log('\n测试直属排行榜...')
    const subordinateResult = await cloud.callFunction({
      name: 'getRankings',
      data: {
        type: 'subordinate'
      }
    })

    if (subordinateResult.result && subordinateResult.result.success) {
      console.log('✅ 直属排行榜正常')
      console.log(`   返回 ${subordinateResult.result.data.rankings.length} 个老板`)
    } else {
      console.log('❌ 直属排行榜失败:', subordinateResult.result?.error)
    }

    console.log('\n🎉 测试完成')

  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
testRankingsFunction()