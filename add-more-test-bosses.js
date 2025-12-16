// 添加更多测试老板用户的脚本
// 在微信开发者工具云控制台中运行此代码

const db = cloud.database()

// 添加更多测试老板用户
async function addMoreTestBosses() {
  const additionalBosses = [
    {
      _openid: 'boss_test_004',
      role: 'Boss',
      nickname: '赵总',
      userId: 'B0004',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boss4',
      walletBalance: 800.00,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _openid: 'boss_test_005',
      role: 'Boss',
      nickname: '钱董',
      userId: 'B0005',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boss5',
      walletBalance: 1500.00,
      createTime: new Date(),
      updateTime: new Date()
    }
  ]

  console.log('开始添加更多测试老板用户...')

  for (const boss of additionalBosses) {
    try {
      // 检查是否已存在
      const existing = await db.collection('users').where({
        _openid: boss._openid
      }).get()

      if (existing.data.length === 0) {
        await db.collection('users').add({
          data: boss
        })
        console.log(`✅ 新增老板: ${boss.nickname} (余额: ¥${boss.walletBalance})`)
      } else {
        console.log(`⚠️ 老板 ${boss.nickname} 已存在`)
      }
    } catch (error) {
      console.error(`❌ 添加老板 ${boss.nickname} 失败:`, error)
    }
  }

  console.log('额外测试老板用户添加完成！')
}

// 检查当前老板总数
async function checkBossCount() {
  const result = await db.collection('users').where({
    role: 'Boss'
  }).get()

  console.log(`\n当前系统共有 ${result.data.length} 个老板用户:`)
  result.data.forEach((boss, index) => {
    console.log(`${index + 1}. ${boss.nickname} (${boss.userId}) - 余额: ¥${boss.walletBalance || 0}`)
  })
}

// 主函数
async function main() {
  await addMoreTestBosses()
  await checkBossCount()

  console.log('\n现在你可以测试老板充值功能了！')
  console.log('在管理员首页点击"老板充值"按钮查看所有老板。')
}

main()
