// 提交报备云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log('收到报备提交请求:', {
    openid: openid,
    amount: event.amount,
    amountType: typeof event.amount,
    duration: event.duration,
    game: event.game,
    bossId: event.bossId,
    allFields: Object.keys(event)
  })

  try {
    // 验证用户角色（必须是员工）
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0 || !['Staff', 'Admin', 'SuperAdmin'].includes(userResult.data[0].role)) {
      return {
        success: false,
        error: '只有员工可以提交报备'
      }
    }

    // 处理金额：确保是数字类型
    let amountValue = 0
    if (event.amount !== undefined && event.amount !== null) {
      const parsed = Number(event.amount)
      if (!isNaN(parsed) && parsed >= 0) {
        amountValue = parsed
      }
    }
    
    console.log('金额处理结果:', {
      original: event.amount,
      originalType: typeof event.amount,
      parsed: amountValue,
      parsedType: typeof amountValue
    })

    // 创建报备记录
    const report = {
      _openid: openid,
      staffId: openid,
      bossId: event.bossId,
      date: event.date,
      game: event.game,
      duration: event.duration,
      amount: amountValue, // 订单金额
      platform: event.platform || '',
      services: event.services || [],
      remark: event.remark || '',
      images: event.images || [],
      status: 'pending', // 待审核
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    console.log('准备保存报备数据:', JSON.stringify(report, null, 2))

    const result = await db.collection('reports').add({
      data: report
    })

    console.log('报备保存成功, ID:', result._id)
    console.log('保存的数据:', report)

    // 验证保存的数据
    const savedReport = await db.collection('reports').doc(result._id).get()
    console.log('验证保存的数据:', savedReport.data)
    
    // 特别验证金额字段
    if (savedReport.data) {
      console.log('保存的金额验证:', {
        报备ID: savedReport.data._id,
        金额字段: savedReport.data.amount,
        金额类型: typeof savedReport.data.amount,
        是否等于提交值: savedReport.data.amount === amountValue
      })
      
      if (savedReport.data.amount !== amountValue) {
        console.error('❌ 金额保存不匹配！提交值:', amountValue, '保存值:', savedReport.data.amount)
      } else {
        console.log('✅ 金额保存正确')
      }
    }

    return {
      success: true,
      data: {
        _id: result._id,
        ...report
      }
    }
  } catch (err) {
    console.error('提交报备失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
