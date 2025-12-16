
// 检查所有用户数据，特别是小陈1和老板
const checkAllUsers = async () => {
  console.log('=== 检查所有用户数据 ===')
  
  const db = wx.cloud.database()
  
  try {
    // 获取所有用户
    const usersResult = await db.collection('users').get()
    console.log('总用户数量:', usersResult.data.length)
    
    console.log('
=== 所有用户列表 ===')
    usersResult.data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.userId}) [角色: ${user.role}] [openid: ${user._openid}]`)
    })
    
    // 查找小陈1
    const xiaoChen = usersResult.data.find(u => u.nickname === '小陈1')
    if (xiaoChen) {
      console.log('
=== 找到小陈1 ===')
      console.log('昵称:', xiaoChen.nickname)
      console.log('用户ID:', xiaoChen.userId)
      console.log('角色:', xiaoChen.role)
      console.log('openid:', xiaoChen._openid)
    } else {
      console.log('
❌ 没有找到小陈1')
    }
    
    // 查找所有老板
    const bosses = usersResult.data.filter(u => u.role === 'Boss')
    console.log('
=== 所有老板 ===')
    bosses.forEach((boss, index) => {
      console.log(`${index + 1}. ${boss.nickname} (${boss.userId}) [openid: ${boss._openid}]`)
    })
    
    // 检查绑定关系
    console.log('
=== 绑定关系 ===')
    const bindings = await db.collection('bindings').get()
    console.log('绑定关系数量:', bindings.data.length)
    
    bindings.data.forEach((binding, index) => {
      const boss = usersResult.data.find(u => u._openid === binding.bossId)
      const staff = usersResult.data.find(u => u._openid === binding.staffId)
      
      console.log(`${index + 1}. 老板: ${boss ? boss.nickname : '未知'} → 员工: ${staff ? staff.nickname : '未知'} [状态: ${binding.status}]`)
    })
    
    wx.showToast({
      title: '检查完成，查看控制台',
      icon: 'none'
    })
    
  } catch (error) {
    console.error('检查失败:', error)
    wx.showToast({
      title: '检查失败',
      icon: 'none'
    })
  }
}

checkAllUsers()

