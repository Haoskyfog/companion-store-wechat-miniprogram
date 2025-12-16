// 完整测试流程脚本
// 测试员工下单、老板支付、管理员审核报备的完整流程
// 在微信开发者工具云控制台中运行此代码

const db = cloud.database()

// 测试数据
const testData = {
  staff: {
    openid: 'staff_test_chen1',
    nickname: '小陈1',
    userId: '20010',
    role: 'Staff'
  },
  boss: {
    openid: 'boss_test_holo',
    nickname: '团长Holo',
    userId: '10010',
    role: 'Boss',
    walletBalance: 100, // 初始余额100元
    totalConsumption: 0,
    vipLevel: 'VIP0'
  },
  admin: {
    openid: 'admin_test_super',
    nickname: '超级管理员',
    userId: '00001',
    role: 'SuperAdmin'
  }
}

// 创建测试用户
async function createTestUsers() {
  console.log('开始创建测试用户...')

  const users = [testData.staff, testData.boss, testData.admin]

  for (const user of users) {
    try {
      // 检查是否已存在
      const existing = await db.collection('users').where({
        _openid: user.openid
      }).get()

      if (existing.data.length === 0) {
        await db.collection('users').add({
          data: {
            ...user,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname}`,
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
            approvedReports: 0 // 初始化报备通过数
          }
        })
        console.log(`用户 ${user.nickname} 创建成功`)
      } else {
        console.log(`用户 ${user.nickname} 已存在`)
      }
    } catch (error) {
      console.error(`创建用户 ${user.nickname} 失败:`, error)
    }
  }

  console.log('测试用户创建完成')
}

// 创建绑定关系
async function createBinding() {
  console.log('开始创建绑定关系...')

  try {
    // 检查是否已存在绑定
    const existing = await db.collection('bindings').where({
      bossId: testData.boss.openid,
      staffId: testData.staff.openid,
      status: 'active'
    }).get()

    if (existing.data.length === 0) {
      await db.collection('bindings').add({
        data: {
          bossId: testData.boss.openid,
          staffId: testData.staff.openid,
          status: 'active',
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          creatorId: testData.admin.openid
        }
      })
      console.log('绑定关系创建成功')
    } else {
      console.log('绑定关系已存在')
    }
  } catch (error) {
    console.error('创建绑定关系失败:', error)
  }
}

// 创建20元订单
async function createOrder() {
  console.log('开始创建20元订单...')

  try {
    const order = {
      _openid: testData.staff.openid,
      staffId: testData.staff.openid,
      bossId: testData.boss.openid,
      game: '王者荣耀',
      duration: 2,
      date: new Date().toISOString().split('T')[0], // 今天日期
      position: '中路',
      remark: '双排上分测试订单',
      services: ['rank', 'voice'],
      amount: 20, // 20元订单
      paymentStatus: 'unpaid',
      complaintStatus: 'none',
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('orders').add({
      data: order
    })

    console.log('订单创建成功，订单ID:', result._id)
    return result._id
  } catch (error) {
    console.error('创建订单失败:', error)
    throw error
  }
}

// 模拟老板支付订单
async function payOrder(orderId) {
  console.log('开始模拟老板支付订单...')

  try {
    // 先检查订单状态
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (!orderResult.data) {
      throw new Error('订单不存在')
    }

    const order = orderResult.data

    // 检查老板余额
    const bossResult = await db.collection('users').where({
      _openid: testData.boss.openid
    }).get()

    if (bossResult.data.length === 0) {
      throw new Error('老板用户不存在')
    }

    const boss = bossResult.data[0]

    if (boss.walletBalance < order.amount) {
      throw new Error(`老板余额不足: ${boss.walletBalance} < ${order.amount}`)
    }

    // 更新订单状态为已确认（先确认再支付）
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'confirmed',
        updateTime: db.serverDate()
      }
    })

    // 扣减余额并增加消费总额
    await db.collection('users').where({
      _openid: testData.boss.openid
    }).update({
      data: {
        walletBalance: db.command.inc(-order.amount),
        totalConsumption: db.command.inc(order.amount),
        updateTime: db.serverDate()
      }
    })

    // 更新订单为已支付
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: 'paid',
        paymentTime: db.serverDate(),
        status: 'completed',
        updateTime: db.serverDate()
      }
    })

    console.log('订单支付成功')
  } catch (error) {
    console.error('支付订单失败:', error)
    throw error
  }
}

// 创建报备记录
async function createReport() {
  console.log('开始创建报备记录...')

  try {
    const report = {
      _openid: testData.staff.openid,
      staffId: testData.staff.openid,
      bossId: testData.boss.openid,
      date: new Date().toISOString().split('T')[0], // 今天日期
      game: '王者荣耀',
      duration: 2,
      platform: '比心',
      services: ['rank', 'voice'],
      remark: '双排上分，客户很满意',
      images: [],
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('reports').add({
      data: report
    })

    console.log('报备记录创建成功，报备ID:', result._id)
    return result._id
  } catch (error) {
    console.error('创建报备记录失败:', error)
    throw error
  }
}

// 管理员审核通过报备
async function auditReport(reportId) {
  console.log('开始审核通过报备...')

  try {
    // 更新报备状态
    await db.collection('reports').doc(reportId).update({
      data: {
        status: 'approved',
        auditTime: db.serverDate(),
        auditorId: testData.admin.openid,
        auditRemark: '审核通过，服务质量良好',
        updateTime: db.serverDate()
      }
    })

    // 增加员工的报备通过数
    const reportResult = await db.collection('reports').doc(reportId).get()
    if (reportResult.data) {
      const staffId = reportResult.data.staffId
      await db.collection('users').where({
        _openid: staffId
      }).update({
        data: {
          approvedReports: db.command.inc(1),
          updateTime: db.serverDate()
        }
      })
    }

    console.log('报备审核通过成功')
  } catch (error) {
    console.error('审核报备失败:', error)
    throw error
  }
}

// 检查测试结果
async function checkResults(orderId, reportId) {
  console.log('开始检查测试结果...')

  try {
    // 检查老板信息（余额和消费总额）
    const bossResult = await db.collection('users').where({
      _openid: testData.boss.openid
    }).get()

    if (bossResult.data.length > 0) {
      const boss = bossResult.data[0]
      console.log('老板信息:')
      console.log(`- 钱包余额: ${boss.walletBalance}元 (应为80元)`)
      console.log(`- 消费总额: ${boss.totalConsumption}元 (应为20元)`)
      console.log(`- VIP等级: ${boss.vipLevel}`)
    }

    // 检查员工信息（报备通过数）
    const staffResult = await db.collection('users').where({
      _openid: testData.staff.openid
    }).get()

    if (staffResult.data.length > 0) {
      const staff = staffResult.data[0]
      console.log('员工信息:')
      console.log(`- 报备通过数: ${staff.approvedReports} (应为1)`)
    }

    // 检查订单状态
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (orderResult.data) {
      const order = orderResult.data
      console.log('订单信息:')
      console.log(`- 订单状态: ${order.status} (应为completed)`)
      console.log(`- 支付状态: ${order.paymentStatus} (应为paid)`)
      console.log(`- 订单金额: ${order.amount}元`)
    }

    // 检查报备状态
    const reportResult = await db.collection('reports').doc(reportId).get()
    if (reportResult.data) {
      const report = reportResult.data
      console.log('报备信息:')
      console.log(`- 报备状态: ${report.status} (应为approved)`)
    }

    // 检查管理员统计数据
    console.log('检查管理员统计数据...')
    // 这里可以调用getStatistics云函数，但为了简化，直接查询数据库

    const paidOrders = await db.collection('orders').where({
      paymentStatus: 'paid'
    }).get()

    const totalRevenue = paidOrders.data.reduce((sum, order) => sum + (order.amount || 0), 0)
    console.log(`管理员统计 - 总流水: ${totalRevenue}元 (应至少包含20元)`)

  } catch (error) {
    console.error('检查结果失败:', error)
  }
}

// 主测试流程
async function runCompleteTest() {
  try {
    console.log('=== 开始完整测试流程 ===')

    // 1. 创建测试用户
    await createTestUsers()

    // 2. 创建绑定关系
    await createBinding()

    // 3. 小陈1创建20元订单
    const orderId = await createOrder()
    console.log('✅ 步骤1完成：小陈1创建了20元订单')

    // 4. 模拟老板支付订单
    await payOrder(orderId)
    console.log('✅ 步骤2完成：老板支付了20元订单')

    // 5. 小陈1创建报备记录
    const reportId = await createReport()
    console.log('✅ 步骤3完成：小陈1提交了报备记录')

    // 6. 管理员审核通过报备
    await auditReport(reportId)
    console.log('✅ 步骤4完成：管理员审核通过了报备')

    // 7. 检查所有结果
    await checkResults(orderId, reportId)

    console.log('=== 测试流程完成！ ===')
    console.log('现在可以在小程序中查看：')
    console.log('1. 老板端 - 我的订单：查看已完成的订单')
    console.log('2. 员工端 - 我的资料：查看报备通过数')
    console.log('3. 管理员端 - 数据统计：查看总流水')

  } catch (error) {
    console.error('测试流程失败:', error)
  }
}

// 运行测试
runCompleteTest()
