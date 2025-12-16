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

    // 构建查询条件
    const whereCondition = {}

    // 根据角色过滤数据
    if (userRole === 'Boss') {
      // 老板只能看到与自己相关的报备
      whereCondition.bossId = openid
    } else if (userRole === 'Staff') {
      // 员工只能看到自己提交的报备
      whereCondition.staffId = openid
    }
    // Admin和SuperAdmin可以看到所有报备，不添加角色过滤条件

    // 状态过滤
    if (event.status) {
      whereCondition.status = event.status
    }

    // 应用所有查询条件
    if (Object.keys(whereCondition).length > 0) {
      query = query.where(whereCondition)
    }

    // 分页参数
    const page = event.page || 1
    const pageSize = event.pageSize || 20
    const skip = (page - 1) * pageSize

    // 排序：最新优先
    query = query.orderBy('createTime', 'desc')

    const result = await query.skip(skip).limit(pageSize).get()

    // 获取关联的用户信息
    console.log('查询到的报备总数:', result.data.length)

    const reports = []
    for (const report of result.data) {
      // 调试日志
      console.log('=== 报备数据调试 ===')
      console.log('报备ID:', report._id)
      console.log('员工ID:', report.staffId, '类型:', typeof report.staffId)
      console.log('老板ID:', report.bossId, '类型:', typeof report.bossId)
      console.log('报备状态:', report.status)
      console.log('金额:', report.amount, '类型:', typeof report.amount)
      console.log('时长:', report.duration, '类型:', typeof report.duration)
      console.log('游戏:', report.game)
      console.log('图片数量:', report.images ? report.images.length : 0)
      console.log('创建时间:', report.createTime)
      console.log('所有字段:', Object.keys(report))
      console.log('完整报备对象 keys:', Object.keys(report))
      console.log('amount 值:', report.amount, '是否为数字:', typeof report.amount === 'number')
      
      let staffInfo = null
      let bossInfo = null

      // 确保amount字段存在且为数字类型
      if (report.amount === undefined || report.amount === null) {
        report.amount = 0
      } else {
        // 确保amount是数字类型
        const parsedAmount = Number(report.amount)
        if (!isNaN(parsedAmount)) {
          report.amount = parsedAmount
        } else {
          report.amount = 0
        }
      }
      
      console.log('金额字段处理:', {
        original: report.amount,
        originalType: typeof report.amount,
        after: report.amount,
        afterType: typeof report.amount
      })

      // 获取员工信息
      try {
        const staffResult = await db.collection('users')
          .where({ _openid: report.staffId })
          .get()
        
        console.log('员工查询结果数量:', staffResult.data.length)
        if (staffResult.data.length > 0) {
          console.log('找到员工:', staffResult.data[0].nickname)
        }
        
        if (staffResult.data && staffResult.data.length > 0) {
          staffInfo = {
            nickname: staffResult.data[0].nickname,
            userId: staffResult.data[0].userId,
            avatar: staffResult.data[0].avatar || null
          }
        } else {
          // 用户不存在，尝试用 _id 查询
          console.log('⚠️ 通过_openid查询失败，尝试用_id查询')
          try {
            const staffResultById = await db.collection('users').doc(report.staffId).get()
            if (staffResultById.data) {
              console.log('✅ 通过_id找到员工:', staffResultById.data.nickname)
              staffInfo = {
                nickname: staffResultById.data.nickname,
                userId: staffResultById.data.userId,
                avatar: staffResultById.data.avatar || null
              }
            } else {
              staffInfo = {
                nickname: '员工已删除',
                userId: '未知',
                avatar: null
              }
            }
          } catch (docErr) {
          staffInfo = {
            nickname: '员工已删除',
              userId: '未知',
              avatar: null
            }
          }
        }
      } catch (err) {
        console.error('获取员工信息失败:', report.staffId, err)
        staffInfo = {
          nickname: '员工已删除',
          userId: '未知',
          avatar: null
        }
      }

      // 获取老板信息
      try {
        const bossResult = await db.collection('users')
          .where({ _openid: report.bossId })
          .get()
        
        console.log('老板查询结果数量:', bossResult.data.length)
        if (bossResult.data.length > 0) {
          console.log('找到老板:', bossResult.data[0].nickname)
        }
        
        if (bossResult.data && bossResult.data.length > 0) {
          bossInfo = {
            nickname: bossResult.data[0].nickname,
            userId: bossResult.data[0].userId,
            avatar: bossResult.data[0].avatar || null
          }
        } else {
          // 用户不存在，尝试用 _id 查询
          console.log('⚠️ 通过_openid查询失败，尝试用_id查询')
          try {
            const bossResultById = await db.collection('users').doc(report.bossId).get()
            if (bossResultById.data) {
              console.log('✅ 通过_id找到老板:', bossResultById.data.nickname)
              bossInfo = {
                nickname: bossResultById.data.nickname,
                userId: bossResultById.data.userId,
                avatar: bossResultById.data.avatar || null
              }
            } else {
              bossInfo = {
                nickname: '老板已删除',
                userId: '未知',
                avatar: null
              }
            }
          } catch (docErr) {
          bossInfo = {
            nickname: '老板已删除',
              userId: '未知',
              avatar: null
            }
          }
        }
      } catch (err) {
        console.error('获取老板信息失败:', report.bossId, err)
        bossInfo = {
          nickname: '老板已删除',
          userId: '未知',
          avatar: null
        }
      }
      
      console.log('=== 调试结束 ===\n')

      // 双重过滤：确保状态匹配（防止数据库查询问题）
      if (event.status && report.status !== event.status) {
        continue // 跳过不符合状态的报备
      }

      // 转换图片URL（cloud:// → https://）
      let convertedImages = report.images || []
      if (convertedImages.length > 0) {
        const cloudFileIds = convertedImages.filter(img => img && img.startsWith('cloud://'))
        
        if (cloudFileIds.length > 0) {
          try {
            console.log('转换', cloudFileIds.length, '张云存储图片...')
            const tempResult = await cloud.getTempFileURL({
              fileList: cloudFileIds
            })
            
            // 创建 fileID → tempFileURL 映射（只接受 status === 0）
            const urlMap = {}
            tempResult.fileList.forEach(fileInfo => {
              console.log('文件 status:', fileInfo.status, 'fileID:', fileInfo.fileID)
              if (fileInfo.status === 0 && fileInfo.tempFileURL) {
                urlMap[fileInfo.fileID] = fileInfo.tempFileURL
                console.log('✅ 转换成功')
              } else {
                console.error('❌ 转换失败 status:', fileInfo.status, 'errMsg:', fileInfo.errMsg)
              }
            })
            
            // 替换图片URL，移除转换失败的
            convertedImages = convertedImages
              .map(img => {
                if (img && img.startsWith('cloud://')) {
                  return urlMap[img] || null
                }
                return img
              })
              .filter(img => img !== null)
            
            console.log('最终图片数量:', convertedImages.length)
          } catch (err) {
            console.error('图片转换异常:', err)
            convertedImages = []
          }
        }
      }

      // 最终确保amount字段正确
      const finalAmount = typeof report.amount === 'number' && !isNaN(report.amount) ? report.amount : 0
      
      reports.push({
        ...report,
        amount: finalAmount, // 明确设置amount字段
        images: convertedImages,
        staffInfo,
        bossInfo,
        auditorInfo: report.auditorId ? (() => {
          // 这里简化处理，实际应该查询审核人信息
          return { nickname: '管理员' }
        })() : null
      })
      
      console.log('最终返回的报备金额:', finalAmount, '类型:', typeof finalAmount)
    }

    return {
      success: true,
      data: {
        reports,
        total: reports.length, // 使用过滤后的数量
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