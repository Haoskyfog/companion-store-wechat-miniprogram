// 获取订单列表云函数
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
    
    // 构建查询条件
    let whereCondition = {}

    // 根据角色过滤数据
    if (userRole === 'Boss') {
      // 老板只能看到自己的订单
      whereCondition.bossId = openid
    } else if (userRole === 'Staff') {
      // 员工只能看到自己创建的订单
      whereCondition.staffId = openid
    }
    // Admin和SuperAdmin可以看到所有订单

    // 额外的筛选条件
    if (event.status) {
      whereCondition.status = event.status
    }

    // 按员工ID过滤（老板查看特定员工的订单）- 使用displayStaffId
    if (event.staffId && userRole === 'Boss') {
      whereCondition.displayStaffId = event.staffId
    }

    if (event.paymentStatus) {
      whereCondition.paymentStatus = event.paymentStatus
    }

    if (event.complaintStatus) {
      whereCondition.complaintStatus = event.complaintStatus
    }

    let query = db.collection('orders').where(whereCondition)

    // 分页参数
    const page = event.page || 1
    const pageSize = event.pageSize || 20
    const skip = (page - 1) * pageSize

    // 排序：最新优先
    query = query.orderBy('createTime', 'desc')

    const result = await query.skip(skip).limit(pageSize).get()

    // 获取关联的用户信息
    const orders = []
    for (const order of result.data) {
      let staffInfo = null
      let bossInfo = null

      // 获取员工信息（显示给老板看的服务员工）
      // 优先使用 displayStaffId，没有则使用 staffId
      const displayStaffId = order.displayStaffId || order.staffId
      try {
        const staffResult = await db.collection('users')
          .where({ _openid: displayStaffId })
          .get()
        if (staffResult.data && staffResult.data.length > 0) {
          staffInfo = {
            nickname: staffResult.data[0].nickname,
            userId: staffResult.data[0].userId,
            avatar: staffResult.data[0].avatar || null
          }
        } else {
          // 用户不存在
          staffInfo = {
            nickname: '员工已删除',
            userId: '未知',
            avatar: null
          }
        }
      } catch (err) {
        console.warn('获取员工信息失败:', displayStaffId, err.message)
        staffInfo = {
          nickname: '员工已删除',
          userId: '未知',
          avatar: null
        }
      }

      // 获取老板信息
      try {
        const bossResult = await db.collection('users')
          .where({ _openid: order.bossId })
          .get()
        if (bossResult.data && bossResult.data.length > 0) {
          bossInfo = {
            nickname: bossResult.data[0].nickname,
            userId: bossResult.data[0].userId,
            avatar: bossResult.data[0].avatar || null
          }
        } else {
          // 用户不存在
          bossInfo = {
            nickname: '老板已删除',
            userId: '未知',
            avatar: null
          }
        }
      } catch (err) {
        console.warn('获取老板信息失败:', order.bossId, err.message)
        bossInfo = {
          nickname: '老板已删除',
          userId: '未知',
          avatar: null
        }
      }

      orders.push({
        ...order,
        staffInfo,
        bossInfo
      })
    }

    return {
      success: true,
      data: {
        orders,
        total: result.data.length, // 简化版，实际应该用count
        page,
        pageSize
      }
    }
  } catch (err) {
    console.error('获取订单列表失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}