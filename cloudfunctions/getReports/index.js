// 获取报备列表云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证用户权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const userRole = userResult.data[0].role
    let query = db.collection('reports')

    // 根据角色过滤数据
    if (userRole === 'Boss') {
      // 老板只能看到与自己相关的报备
      query = query.where({
        bossId: openid
      })
    } else if (userRole === 'Staff') {
      // 员工只能看到自己提交的报备
      query = query.where({
        staffId: openid
      })
    }
    // Admin和SuperAdmin可以看到所有报备

    // 状态过滤
    if (event.status) {
      query = query.where({
        status: event.status
      })
    }

    // 分页参数
    const page = event.page || 1
    const pageSize = event.pageSize || 20
    const skip = (page - 1) * pageSize

    // 排序：最新优先
    query = query.orderBy('createTime', 'desc')

    const result = await query.skip(skip).limit(pageSize).get()

    // 获取关联的用户信息
    const reports = []
    for (const report of result.data) {
      // 获取员工信息
      const staffResult = await db.collection('users').doc(report.staffId).get()
      // 获取老板信息
      const bossResult = await db.collection('users').doc(report.bossId).get()

      reports.push({
        ...report,
        staffInfo: staffResult.data ? {
          nickname: staffResult.data.nickname,
          userId: staffResult.data.userId
        } : null,
        bossInfo: bossResult.data ? {
          nickname: bossResult.data.nickname,
          userId: bossResult.data.userId
        } : null,
        auditorInfo: report.auditorId ? (() => {
          // 这里简化处理，实际应该查询审核人信息
          return { nickname: '管理员' }
        })() : null
      })
    }

    return {
      success: true,
      data: {
        reports,
        total: result.data.length,
        page,
        pageSize
      }
    }
  } catch (err) {
    console.error('获取报备列表失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}