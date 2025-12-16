// 云函数 getContent（统一返回结构版本）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { type } = event

    // 统一处理的内容类型
    const allTypes = ['banner', 'notice', 'birthday', 'gallery', 'recommend']
    const targetTypes = type ? [type] : allTypes

    const content = {}

    for (const contentType of targetTypes) {
      let result
      try {
        result = await db.collection('content')
        .where({
          type: contentType,
          status: 'active'
        })
        .orderBy('order', 'asc')
        .get()
      } catch (err) {
        console.error(`查询${contentType}内容失败:`, err)
        // 如果查询失败，设置为空数组，继续处理其他类型
        content[contentType] = []
        continue
      }

      let processedData = result.data || []

      // 处理图片URL：将 cloud:// 转换为 https
      processedData = await Promise.all(processedData.map(async (item) => {
        if (item.images && Array.isArray(item.images)) {
          // 收集所有需要转换的 cloud:// 文件ID
          const cloudFileIds = item.images.filter(img => img && img.startsWith('cloud://'))

          if (cloudFileIds.length > 0) {
            try {
              // 批量转换 cloud:// 到临时URL
              const tempResult = await cloud.getTempFileURL({
                fileList: cloudFileIds
              })

              // 创建 fileID 到 tempFileURL 的映射
              const urlMap = new Map()
              if (tempResult.fileList) {
                tempResult.fileList.forEach(fileInfo => {
                  if (fileInfo.status === 0 && fileInfo.tempFileURL) {
                    urlMap.set(fileInfo.fileID, fileInfo.tempFileURL)
                  }
                })
              }

              // 替换图片URL
              const convertedImages = item.images.map(img => {
                if (img && img.startsWith('cloud://')) {
                  return urlMap.get(img) || img // 如果转换失败，保留原URL
                }
                return img
              })

              return {
                ...item,
                images: convertedImages
              }
            } catch (err) {
              console.error('图片URL转换失败:', err)
              // 如果转换失败，返回原始数据
              return item
            }
          }
        }
        return item
      }))

      // 推荐内容：关联员工信息
      if (contentType === 'recommend') {
        processedData = await Promise.all(processedData.map(async (item) => {
          if (item.staffIds && Array.isArray(item.staffIds) && item.staffIds.length > 0) {
            // 过滤掉无效的ID
            const validStaffIds = item.staffIds.filter(id => id && typeof id === 'string' && id.trim().length > 0)
            
            if (validStaffIds.length === 0) {
              return {
                ...item,
                staffList: []
              }
            }

            // 批量查询所有员工，避免多次查询
            try {
              const allStaffsResult = await db.collection('users')
                .where({
                  _openid: db.command.in(validStaffIds),
                  role: 'Staff'
                })
                .get()

              // 创建员工映射表
              const staffMap = new Map()
              if (allStaffsResult.data && Array.isArray(allStaffsResult.data)) {
                allStaffsResult.data.forEach(staff => {
                  if (staff && staff._openid) {
                    staffMap.set(staff._openid, staff)
                  }
                })
              }

              // 按照原始顺序构建员工列表，过滤掉不存在的员工
              const staffList = validStaffIds
                .map(id => staffMap.get(id))
                .filter(staff => staff !== undefined && staff !== null)
              .map(staff => ({
                _openid: staff._openid,
                  nickname: staff.nickname || '未知员工',
                  userId: staff.userId || '',
                  avatar: staff.avatar || '',
                tags: ['王者荣耀', '今日推荐'],
                intro: '今日推荐员工，专业陪玩服务！'
              }))

            return {
              ...item,
              staffList
            }
            } catch (err) {
              console.error('获取推荐员工信息失败:', err)
              // 如果查询失败，返回空员工列表，但不影响推荐内容本身
              return {
                ...item,
                staffList: []
              }
            }
          }
          // 如果没有员工ID，返回空列表
          return {
            ...item,
            staffList: []
          }
        }))
      }

      content[contentType] = processedData
    }

    return {
      success: true,
      data: content
    }

  } catch (err) {
    console.error('getContent error:', err)
    return {
      success: false,
      error: err.message
    }
  }
}