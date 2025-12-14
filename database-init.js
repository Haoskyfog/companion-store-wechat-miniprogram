// 数据库集合创建和初始化脚本
// 在微信开发者工具的云开发控制台中执行，或使用云函数执行

const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-7g62s1bob33a0a2c' // 请根据实际情况修改环境ID
})

const db = cloud.database()

// 需要创建的集合列表
const collections = [
  'users',
  'orders',
  'reports',
  'bindings',
  'roleChangeRequests',
  'content',
  'rankings'
]

async function initDatabase() {
  console.log('开始初始化数据库...')

  try {
    // 创建集合
    for (const collectionName of collections) {
      try {
        // 检查集合是否存在
        await db.collection(collectionName).get()
        console.log(`集合 ${collectionName} 已存在`)
      } catch (error) {
        // 如果集合不存在，尝试创建（注意：云数据库通常需要手动在控制台创建）
        console.log(`集合 ${collectionName} 不存在，请在云开发控制台手动创建`)
      }
    }

    // 初始化第一个超级管理员用户（需要替换为实际的openid）
    const superAdmin = {
      _openid: '请替换为你的openid', // 需要从小程序中获取真实的openid
      role: 'SuperAdmin',
      nickname: '超级管理员',
      userId: '10001',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    // 检查是否已存在超级管理员
    const adminCheck = await db.collection('users').where({
      role: 'SuperAdmin'
    }).get()

    if (adminCheck.data.length === 0) {
      await db.collection('users').add({
        data: superAdmin
      })
      console.log('超级管理员用户创建成功')
    } else {
      console.log('超级管理员用户已存在')
    }

    // 初始化一些示例内容
    await initSampleContent()

    console.log('数据库初始化完成！')

  } catch (error) {
    console.error('数据库初始化失败:', error)
  }
}

// 初始化示例内容
async function initSampleContent() {
  const sampleContent = [
    {
      type: 'banner',
      title: '欢迎来到陪玩店',
      images: ['https://example.com/banner1.jpg'],
      order: 1,
      status: 'active'
    },
    {
      type: 'notice',
      title: '温馨提示',
      content: '欢迎使用陪玩店小程序，祝您游戏愉快！',
      status: 'active'
    },
    {
      type: 'gallery',
      title: '游戏截图',
      images: ['https://example.com/game1.jpg', 'https://example.com/game2.jpg'],
      order: 1,
      status: 'active'
    }
  ]

  for (const content of sampleContent) {
    try {
      await db.collection('content').add({
        data: {
          ...content,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      console.log(`示例内容 "${content.title}" 创建成功`)
    } catch (error) {
      console.log(`示例内容 "${content.title}" 可能已存在`)
    }
  }
}

// 导出函数供云函数调用
exports.main = async (event, context) => {
  await initDatabase()
  return {
    success: true,
    message: '数据库初始化完成'
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
}