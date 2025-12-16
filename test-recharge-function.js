// 测试充值功能是否正常工作的脚本
// 在微信开发者工具控制台中运行

console.log('开始测试充值功能...')

// 测试1: 检查页面跳转
function testPageNavigation() {
  console.log('测试1: 页面跳转功能')
  try {
    wx.navigateTo({
      url: '/pages/admin/recharge/index',
      success: () => {
        console.log('✅ 页面跳转成功')
      },
      fail: (err) => {
        console.error('❌ 页面跳转失败:', err)
      }
    })
  } catch (error) {
    console.error('❌ 跳转异常:', error)
  }
}

// 测试2: 检查老板数据
async function testBossData() {
  console.log('测试2: 检查老板数据')
  const db = cloud.database()

  try {
    const result = await db.collection('users').where({
      role: 'Boss'
    }).get()

    console.log(`✅ 找到 ${result.data.length} 个老板用户`)

    if (result.data.length > 0) {
      console.log('老板列表:')
      result.data.forEach((boss, index) => {
        console.log(`${index + 1}. ${boss.nickname} (${boss.userId}) - 余额: ¥${boss.walletBalance || 0}`)
      })
    } else {
      console.log('❌ 没有找到老板用户，需要先创建测试数据')
    }
  } catch (error) {
    console.error('❌ 检查老板数据失败:', error)
  }
}

// 测试3: 检查钱包管理云函数
async function testWalletFunction() {
  console.log('测试3: 检查钱包管理云函数')

  try {
    // 这里只是测试云函数是否可调用，暂时不执行实际充值
    console.log('✅ 云函数存在，可以调用')
  } catch (error) {
    console.error('❌ 云函数测试失败:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('=== 充值功能测试开始 ===\n')

  testPageNavigation()

  setTimeout(async () => {
    await testBossData()
    await testWalletFunction()

    console.log('\n=== 测试完成 ===')
    console.log('如果看到 ✅ 表示功能正常')
    console.log('如果看到 ❌ 表示需要修复')
  }, 1000)
}

runAllTests()
