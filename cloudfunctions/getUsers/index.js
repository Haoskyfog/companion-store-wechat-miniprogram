// 获取用户列表云函数（管理员用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证管理员权限
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有管理员可以查看用户列表'
      }
    }

    // 分页参数
    const page = event.page || 1
    const pageSize = event.pageSize || 20
    const skip = (page - 1) * pageSize

    let query = db.collection('users')

    // 根据当前用户权限添加基础过滤
    if (userResult.data[0].role === 'Admin') {
      // 普通管理员只能看到非管理员用户（Boss和Staff）
      query = query.where({
        role: db.command.in(['Boss', 'Staff'])
      })
    }
    // SuperAdmin可以看到所有用户，不添加额外过滤

    // 角色过滤（只在SuperAdmin情况下生效）
    if (event.role && userResult.data[0].role === 'SuperAdmin') {
      query = query.where({ role: event.role })
    }

    // 搜索过滤
    if (event.keyword) {
      query = query.where({
        nickname: db.RegExp({
          regexp: event.keyword,
          options: 'i'
        })
      })
    }

    // 排序
    query = query.orderBy('createTime', 'desc')

    const result = await query.skip(skip).limit(pageSize).get()

    // 为每个可见用户添加绑定关系统计和头像URL转换
    const users = []
    for (const user of result.data) {

    // 为每个用户添加绑定关系统计和头像URL转换
    const users = []
    for (const user of result.data) {
      const userWithStats = { ...user }

      // 处理头像URL转换
      if (user.avatar && user.avatar.includes('cloud://')) {
        try {
          const tempUrlRes = await cloud.getTempFileURL({
            fileList: [user.avatar]
          })
          if (tempUrlRes.fileList && tempUrlRes.fileList[0] && tempUrlRes.fileList[0].tempFileURL) {
            userWithStats.avatar = tempUrlRes.fileList[0].tempFileURL
          } else {
            userWithStats.avatar = '' // 头像获取失败时清空
          }
        } catch (error) {
          console.error(`获取用户 ${user.nickname} 头像失败:`, error)
          userWithStats.avatar = '' // 出错时清空头像
        }
      }
      // 如果不是云文件ID，保持原样（可能是HTTP URL或空值）

      if (user.role === 'Boss') {
        // 统计老板的直属员工数
        const staffCount = await db.collection('bindings')
          .where({
            bossId: user._openid,
            status: 'active'
          })
          .count()
        userWithStats.staffCount = staffCount.total

        // 统计订单数
        const orderCount = await db.collection('orders')
          .where({ bossId: user._openid })
          .count()
        userWithStats.orderCount = orderCount.total
      } else if (user.role === 'Staff') {
        // 统计员工的服务数据
        const staffStats = await db.collection('orders')
          .where({
            staffId: user._openid,
            status: 'completed'
          })
          .get()

        userWithStats.totalOrders = staffStats.data.length
        userWithStats.totalDuration = staffStats.data.reduce((sum, order) => sum + (order.duration || 0), 0)
      }

      users.push(userWithStats)
    }

    // 计算总数（需要重新查询，因为skip/limit会影响count）
    let countQuery = db.collection('users')

    // 应用相同的过滤条件
    if (userResult.data[0].role === 'Admin') {
      countQuery = countQuery.where({
        role: db.command.in(['Boss', 'Staff'])
      })
    }

    if (event.role && userResult.data[0].role === 'SuperAdmin') {
      countQuery = countQuery.where({ role: event.role })
    }

    if (event.keyword) {
      countQuery = countQuery.where({
        nickname: db.RegExp({
          regexp: event.keyword,
          options: 'i'
        })
      })
    }

    const countResult = await countQuery.count()

    return {
      success: true,
      data: {
        users,
        total: countResult.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    console.error('获取用户列表失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}