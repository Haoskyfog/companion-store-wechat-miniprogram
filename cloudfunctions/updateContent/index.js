// 内容管理云函数（增删改查）
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
        error: '只有管理员可以管理内容'
      }
    }

    const { action, data } = event

    switch (action) {
      case 'create':
        return await createContent(data)
      case 'update':
        return await updateContent(event.id, data)
      case 'delete':
        return await deleteContent(event.id)
      case 'list':
        return await listContent(event.filters)
      default:
        return {
          success: false,
          error: '无效的操作'
        }
    }
  } catch (err) {
    console.error('内容管理失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 创建内容
async function createContent(data) {
  const result = await db.collection('content').add({
    data: {
      ...data,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...data
    }
  }
}

// 更新内容
async function updateContent(id, data) {
  await db.collection('content').doc(id).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  })

  return {
    success: true,
    data: { id }
  }
}

// 删除内容
async function deleteContent(id) {
  console.log('开始删除内容, ID:', id, '类型:', typeof id)

  try {
    // 确保ID是字符串格式
    const docId = String(id)
    console.log('转换后的ID:', docId, '类型:', typeof docId)

    // 直接删除，不先检查是否存在（简化逻辑）
    const result = await db.collection('content').doc(docId).remove()
    console.log('删除结果:', result)

    return {
      success: true,
      data: { id: docId }
    }
  } catch (error) {
    console.error('删除过程中出错:', error, error.message)
    return {
      success: false,
      error: error.message || '删除失败'
    }
  }
}

// 列出内容
async function listContent(filters = {}) {
  let query = db.collection('content')

  if (filters.type) {
    query = query.where({ type: filters.type })
  }

  if (filters.status) {
    query = query.where({ status: filters.status })
  }

  query = query.orderBy('order', 'asc').orderBy('createTime', 'desc')

  const result = await query.get()

  return {
    success: true,
    data: result.data
  }
}