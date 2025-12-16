
// 测试绑定关系查询
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const db = cloud.database()
  
  // 直接查询绑定关系
  const bindingsResult = await db.collection('bindings').get()
  console.log('数据库中的绑定关系:', bindingsResult.data)
  
  // 查询所有用户
  const usersResult = await db.collection('users').get()
  console.log('数据库中的用户:', usersResult.data.map(u => ({nickname: u.nickname, role: u.role, _openid: u._openid})))
  
  return {
    bindings: bindingsResult.data,
    users: usersResult.data.length
  }
}
