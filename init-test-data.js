// 初始化测试数据的脚本
// 在微信开发者工具云控制台中运行此代码

const db = cloud.database()

// 创建测试员工
async function createTestStaff() {
  const testStaff = [
    {
      _openid: 'staff_test_001',
      role: 'Staff',
      nickname: '小明',
      userId: '20001',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff1',
      walletBalance: 0,
      createTime: new Date('2025-01-01'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_002',
      role: 'Staff',
      nickname: '小红',
      userId: '20002',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff2',
      walletBalance: 0,
      createTime: new Date('2025-01-02'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_003',
      role: 'Staff',
      nickname: '小刚',
      userId: '20003',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff3',
      walletBalance: 0,
      createTime: new Date('2025-01-03'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_004',
      role: 'Staff',
      nickname: '小李',
      userId: '20004',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff4',
      walletBalance: 0,
      createTime: new Date('2025-01-04'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_005',
      role: 'Staff',
      nickname: '小王',
      userId: '20005',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff5',
      walletBalance: 0,
      createTime: new Date('2025-01-05'),
      updateTime: new Date()
    }
  ]

  console.log('开始创建测试员工...')

  for (const staff of testStaff) {
    try {
      // 检查是否已存在
      const existing = await db.collection('users').where({
        _openid: staff._openid
      }).get()

      if (existing.data.length === 0) {
        await db.collection('users').add({
          data: staff
        })
        console.log(`员工 ${staff.nickname} 创建成功`)
      } else {
        console.log(`员工 ${staff.nickname} 已存在`)
      }
    } catch (error) {
      console.error(`创建员工 ${staff.nickname} 失败:`, error)
    }
  }

  console.log('测试员工创建完成')
}

// 创建测试报备记录
async function createTestReports() {
  // 获取所有Boss用户作为报备的目标
  const bosses = await db.collection('users').where({
    role: 'Boss'
  }).get()

  if (bosses.data.length === 0) {
    console.log('没有找到老板用户，无法创建报备记录')
    return
  }

  const bossId = bosses.data[0]._openid // 使用第一个老板

  const testReports = [
    {
      _openid: 'staff_test_001',
      staffId: 'staff_test_001',
      bossId: bossId,
      date: '2025-12-16',
      game: '王者荣耀',
      duration: 2,
      platform: '比心',
      services: ['rank', 'voice'],
      remark: '双排上分',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-15'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_001',
      staffId: 'staff_test_001',
      bossId: bossId,
      date: '2025-12-15',
      game: '王者荣耀',
      duration: 3,
      platform: '比心',
      services: ['rank'],
      remark: '单排上分',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-14'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_002',
      staffId: 'staff_test_002',
      bossId: bossId,
      date: '2025-12-16',
      game: '和平精英',
      duration: 1,
      platform: '比心',
      services: ['rank', 'voice'],
      remark: '娱乐模式',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-15'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_003',
      staffId: 'staff_test_003',
      bossId: bossId,
      date: '2025-12-16',
      game: '王者荣耀',
      duration: 2,
      platform: '比心',
      services: ['rank'],
      remark: '排位赛',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-15'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_004',
      staffId: 'staff_test_004',
      bossId: bossId,
      date: '2025-12-16',
      game: '原神',
      duration: 4,
      platform: '比心',
      services: ['rank', 'voice'],
      remark: '深渊副本',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-15'),
      updateTime: new Date()
    },
    {
      _openid: 'staff_test_005',
      staffId: 'staff_test_005',
      bossId: bossId,
      date: '2025-12-16',
      game: '王者荣耀',
      duration: 1,
      platform: '比心',
      services: ['fun'],
      remark: '娱乐陪玩',
      images: [],
      status: 'approved',
      auditTime: new Date(),
      auditorId: 'admin_test',
      auditRemark: '审核通过',
      createTime: new Date('2025-12-15'),
      updateTime: new Date()
    }
  ]

  console.log('开始创建测试报备记录...')

  for (const report of testReports) {
    try {
      // 检查是否已存在（避免重复创建）
      const existing = await db.collection('reports').where({
        staffId: report.staffId,
        date: report.date,
        game: report.game
      }).get()

      if (existing.data.length === 0) {
        await db.collection('reports').add({
          data: report
        })
        console.log(`报备记录 ${report.staffId} - ${report.game} 创建成功`)
      } else {
        console.log(`报备记录 ${report.staffId} - ${report.game} 已存在`)
      }
    } catch (error) {
      console.error(`创建报备记录失败:`, error)
    }
  }

  console.log('测试报备记录创建完成')
}

// 主函数
async function initTestData() {
  try {
    console.log('开始初始化测试数据...')

    await createTestStaff()
    await createTestReports()

    console.log('测试数据初始化完成！')
    console.log('现在可以查看员工排行榜了')

  } catch (error) {
    console.error('初始化测试数据失败:', error)
  }
}

// 运行初始化
initTestData()
