
// 查询数据库中的用户和小陈1信息
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 查询所有用户
  const usersResult = await db.collection('users').get()
  console.log('所有用户:', usersResult.data.map(u => ({
    nickname: u.nickname,
    userId: u.userId,
    role: u.role,
    _openid: u._openid.substring(0, 8) + '...'
  })))
  
  // 查找小陈1
  const staffXiaoChen = usersResult.data.find(u => u.nickname === '小陈1')
  console.log('小陈1信息:', staffXiaoChen)
  
  // 查询绑定关系
  const bindingsResult = await db.collection('bindings').get()
  console.log('绑定关系:', bindingsResult.data.map(b => ({
    bossId: b.bossId.substring(0, 8) + '...',
    staffId: b.staffId.substring(0, 8) + '...',
    status: b.status
  })))
  
  return {
    users: usersResult.data.length,
    staffXiaoChen: staffXiaoChen,
    bindings: bindingsResult.data.length
  }
}
