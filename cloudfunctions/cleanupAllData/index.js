// 清理所有订单和报备数据的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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
        error: '只有管理员可以执行清理操作'
      }
    }

    const result = {
      ordersDeleted: 0,
      reportsDeleted: 0,
      errors: []
    }

    // 删除所有订单
    try {
      const ordersResult = await db.collection('orders').get()
      console.log(`找到 ${ordersResult.data.length} 个订单`)

      if (ordersResult.data.length > 0) {
        // 使用批量删除
        const batchSize = 20
        for (let i = 0; i < ordersResult.data.length; i += batchSize) {
          const batch = ordersResult.data.slice(i, i + batchSize)
          const deletePromises = batch.map(order =>
            db.collection('orders').doc(order._id).remove()
          )
          await Promise.all(deletePromises)
          result.ordersDeleted += batch.length
        }
      }
      console.log(`✅ 成功删除 ${result.ordersDeleted} 个订单`)
    } catch (error) {
      console.error('删除订单失败:', error)
      result.errors.push(`删除订单失败: ${error.message}`)
    }

    // 删除所有报备
    try {
      const reportsResult = await db.collection('reports').get()
      console.log(`找到 ${reportsResult.data.length} 个报备`)

      if (reportsResult.data.length > 0) {
        // 使用批量删除
        const batchSize = 20
        for (let i = 0; i < reportsResult.data.length; i += batchSize) {
          const batch = reportsResult.data.slice(i, i + batchSize)
          const deletePromises = batch.map(report =>
            db.collection('reports').doc(report._id).remove()
          )
          await Promise.all(deletePromises)
          result.reportsDeleted += batch.length
        }
      }
      console.log(`✅ 成功删除 ${result.reportsDeleted} 个报备`)
    } catch (error) {
      console.error('删除报备失败:', error)
      result.errors.push(`删除报备失败: ${error.message}`)
    }

    return {
      success: true,
      message: `清理完成：已删除 ${result.ordersDeleted} 个订单和 ${result.reportsDeleted} 个报备`,
      data: result
    }
  } catch (err) {
    console.error('清理操作失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
