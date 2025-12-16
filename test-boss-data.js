// 测试老板数据脚本 - 在云控制台运行
const db = cloud.database()

// 检查并创建测试老板数据
async function setupTestBosses() {
  console.log('开始设置测试老板数据...')

  // 检查现有老板数量
  const existingBosses = await db.collection('users').where({
    role: 'Boss'
  }).get()

  console.log(`当前有 ${existingBosses.data.length} 个老板用户`)

  if (existingBosses.data.length === 0) {
    console.log('没有老板用户，开始创建测试数据...')

    const testBosses = [
      {
        _openid: 'boss_test_001',
        role: 'Boss',
        nickname: '张老板',
        userId: 'B0001',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boss1',
        walletBalance: 500.00,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        _openid: 'boss_test_002',
        role: 'Boss',
        nickname: '李总',
        userId: 'B0002',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boss2',
        walletBalance: 1200.50,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        _openid: 'boss_test_003',
        role: 'Boss',
        nickname: '王经理',
        userId: 'B0003',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boss3',
        walletBalance: 0.00,
        createTime: new Date(),
        updateTime: new Date()
      }
    ]

    for (const boss of testBosses) {
      try {
        await db.collection('users').add({
          data: boss
        })
        console.log(`✅ 创建老板: ${boss.nickname} (余额: ¥${boss.walletBalance})`)
      } catch (error) {
        console.error(`❌ 创建老板失败: ${boss.nickname}`, error)
      }
    }

    console.log('测试老板数据创建完成！')
  } else {
    console.log('已有老板数据，无需创建')
  }

  // 重新检查
  const finalBosses = await db.collection('users').where({
    role: 'Boss'
  }).get()

  console.log(`最终老板数量: ${finalBosses.data.length}`)
  console.log('测试数据设置完成，可以开始测试充值功能了！')
}

setupTestBosses()
