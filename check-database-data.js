// 检查数据库中现有数据的脚本
// 在微信开发者工具云控制台中运行此代码

const db = cloud.database()

async function checkDatabaseData() {
  console.log('开始检查数据库数据...\n')

  try {
    // 检查员工用户
    console.log('=== 检查员工用户 ===')
    const staffResult = await db.collection('users').where({
      role: 'Staff'
    }).get()

    console.log(`找到 ${staffResult.data.length} 个员工用户:`)
    staffResult.data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.userId}) - _openid: ${user._openid}`)
    })

    if (staffResult.data.length === 0) {
      console.log('❌ 没有找到任何员工用户！')
      return
    }

    // 检查报备记录
    console.log('\n=== 检查报备记录 ===')
    const staffIds = staffResult.data.map(user => user._openid)
    const reportsResult = await db.collection('reports').where({
      staffId: db.command.in(staffIds)
    }).get()

    console.log(`找到 ${reportsResult.data.length} 条报备记录:`)

    const statusCount = { pending: 0, approved: 0, rejected: 0 }
    reportsResult.data.forEach((report, index) => {
      const staff = staffResult.data.find(u => u._openid === report.staffId)
      const staffName = staff ? staff.nickname : '未知员工'
      console.log(`${index + 1}. ${staffName} - ${report.game} - 状态: ${report.status} - 日期: ${report.date}`)

      if (statusCount[report.status] !== undefined) {
        statusCount[report.status]++
      }
    })

    console.log(`\n报备状态统计:`)
    console.log(`- 待审核: ${statusCount.pending}`)
    console.log(`- 已通过: ${statusCount.approved}`)
    console.log(`- 已驳回: ${statusCount.rejected}`)

    if (statusCount.approved === 0) {
      console.log('❌ 没有已批准的报备记录！排行榜无法显示数据')
    } else {
      console.log('✅ 有已批准的报备记录，排行榜应该能正常显示')
    }

    // 检查老板用户（用于创建报备）
    console.log('\n=== 检查老板用户 ===')
    const bossResult = await db.collection('users').where({
      role: 'Boss'
    }).get()

    console.log(`找到 ${bossResult.data.length} 个老板用户:`)
    bossResult.data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.userId}) - _openid: ${user._openid}`)
    })

    if (bossResult.data.length === 0) {
      console.log('❌ 没有找到老板用户！无法创建报备')
    }

    // 生成排行榜预览
    if (statusCount.approved > 0) {
      console.log('\n=== 排行榜预览 ===')
      const rankings = {}

      // 统计每个员工的报备通过数
      reportsResult.data.forEach(report => {
        if (report.status === 'approved') {
          if (!rankings[report.staffId]) {
            rankings[report.staffId] = 0
          }
          rankings[report.staffId]++
        }
      })

      // 转换为数组并排序
      const rankingList = Object.entries(rankings)
        .map(([staffId, count]) => {
          const staff = staffResult.data.find(u => u._openid === staffId)
          return {
            staffId,
            nickname: staff ? staff.nickname : '未知',
            userId: staff ? staff.userId : staffId.substring(0, 8),
            approvedReports: count
          }
        })
        .sort((a, b) => b.approvedReports - a.approvedReports)

      console.log('排行榜（按报备通过数排序）:')
      rankingList.forEach((item, index) => {
        console.log(`${index + 1}. ${item.nickname} (${item.userId}) - ${item.approvedReports} 个已批准报备`)
      })
    }

  } catch (error) {
    console.error('检查数据库数据失败:', error)
  }
}

// 运行检查
checkDatabaseData()
