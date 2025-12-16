# 清理重复用户记录指南

## 问题说明

数据库中同一个 `_openid` 对应了多条用户记录，导致：
- 用户信息显示混乱
- 数据统计不准确
- 可能影响业务逻辑

---

## 🚀 快速执行

### 方法1: 作为云函数执行（推荐）

#### 步骤1: 创建云函数

1. 在 `cloudfunctions` 目录下创建新文件夹 `cleanupDuplicateUsers`
2. 将 `cleanup-duplicate-users.js` 的内容复制到 `cloudfunctions/cleanupDuplicateUsers/index.js`
3. 创建 `package.json`：

```json
{
  "name": "cleanupDuplicateUsers",
  "version": "1.0.0",
  "description": "清理重复用户记录",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

#### 步骤2: 部署云函数

1. 右键点击 `cleanupDuplicateUsers` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

#### 步骤3: 调用云函数

在管理员端添加一个按钮，或者在云开发控制台手动调用：

```javascript
wx.cloud.callFunction({
  name: 'cleanupDuplicateUsers',
  success: (res) => {
    console.log('清理结果:', res.result)
    wx.showModal({
      title: '清理完成',
      content: res.result.message,
      showCancel: false
    })
  }
})
```

---

### 方法2: 在云开发控制台执行

1. 打开**云开发控制台**
2. 进入**数据库** → **users 集合**
3. 点击"高级操作"
4. 复制以下代码执行：

```javascript
// 查找并显示所有重复用户
const allUsers = await db.collection('users').get()
const openidMap = {}
const duplicates = []

allUsers.data.forEach(user => {
  if (!openidMap[user._openid]) {
    openidMap[user._openid] = []
  }
  openidMap[user._openid].push(user)
})

Object.keys(openidMap).forEach(openid => {
  if (openidMap[openid].length > 1) {
    duplicates.push({
      openid: openid,
      count: openidMap[openid].length,
      records: openidMap[openid].map(u => ({
        _id: u._id,
        nickname: u.nickname,
        role: u.role
      }))
    })
  }
})

console.log('重复用户列表:', duplicates)

// 手动删除（根据上面的结果）
// db.collection('users').doc('要删除的_id').remove()
```

---

## 📋 保留规则

脚本会按照以下优先级选择要保留的记录：

### 优先级1: 角色权重
```
SuperAdmin (4) > Admin (3) > Staff (2) > Boss (1)
```
- 保留角色权重最高的记录
- 例如：如果同一用户既是Admin又是Boss，保留Admin记录

### 优先级2: 是否有昵称
- 有昵称的记录优先于空昵称的记录

### 优先级3: 创建时间
- 保留创建时间最新的记录

---

## 🔍 执行示例

### 执行前

```
用户记录：
1. _id: xxx1, _openid: oABC123, nickname: "张三", role: "Boss"
2. _id: xxx2, _openid: oABC123, nickname: "", role: "Boss"
3. _id: yyy1, _openid: oDEF456, nickname: "李四", role: "Admin"
4. _id: yyy2, _openid: oDEF456, nickname: "李四", role: "Staff"
```

### 执行日志

```
=== 开始清理重复用户记录 ===

步骤1: 获取所有用户记录...
找到 4 条用户记录

步骤2: 检测重复记录...
⚠️  发现 2 个用户有重复记录

处理重复用户: oABC123
  共有 2 条记录：
  1. ID: xxx1
     昵称: 张三
     角色: Boss
     创建时间: 2025-12-16T10:00:00.000Z
  2. ID: xxx2
     昵称: 未设置
     角色: Boss
     创建时间: 2025-12-16T09:00:00.000Z

  ✅ 保留记录: xxx1 (张三 - Boss)
  ❌ 已删除: xxx2 (未设置)

处理重复用户: oDEF456
  共有 2 条记录：
  1. ID: yyy1
     昵称: 李四
     角色: Admin
     创建时间: 2025-12-16T10:00:00.000Z
  2. ID: yyy2
     昵称: 李四
     角色: Staff
     创建时间: 2025-12-16T11:00:00.000Z

  ✅ 保留记录: yyy1 (李四 - Admin)
  ❌ 已删除: yyy2 (李四)

=== 清理完成 ===
✅ 成功删除 2 条重复记录
✅ 保留 2 条有效记录
```

### 执行后

```
用户记录：
1. _id: xxx1, _openid: oABC123, nickname: "张三", role: "Boss"
2. _id: yyy1, _openid: oDEF456, nickname: "李四", role: "Admin"
```

---

## ⚠️ 注意事项

1. **备份数据**
   - 执行前建议先导出用户数据备份
   - 云开发控制台 → 数据库 → 导出

2. **检查关联数据**
   - 删除用户记录前，确认该用户没有重要的订单、报备等关联数据
   - 脚本只删除用户记录，不处理关联数据

3. **执行时机**
   - 建议在系统维护时执行
   - 避免用户正在使用时执行

4. **执行一次即可**
   - 清理完成后不需要重复执行
   - 除非又出现了新的重复数据

---

## 🔧 自定义保留规则

如果需要修改保留规则，编辑 `selectUserToKeep` 函数：

```javascript
function selectUserToKeep(users) {
  // 自定义规则
  // 例如：始终保留最早创建的记录
  users.sort((a, b) => {
    const timeA = new Date(a.createTime).getTime()
    const timeB = new Date(b.createTime).getTime()
    return timeA - timeB  // 升序，保留最早的
  })
  
  return users[0]
}
```

---

## 📊 验证清理结果

执行完成后，在云开发控制台验证：

```javascript
// 再次检查是否还有重复
db.collection('users').get().then(res => {
  const openidSet = new Set()
  const duplicates = []
  
  res.data.forEach(user => {
    if (openidSet.has(user._openid)) {
      duplicates.push(user._openid)
    }
    openidSet.add(user._openid)
  })
  
  if (duplicates.length === 0) {
    console.log('✅ 验证通过：没有重复记录')
  } else {
    console.log('❌ 仍有重复:', duplicates)
  }
})
```

---

## 🎯 预防未来重复

清理完成后，可以添加防重复检查：

在 `getUserInfo` 云函数中添加：

```javascript
if (userResult.data.length === 0) {
  // 创建前再次检查（防止并发）
  const doubleCheck = await db.collection('users').where({
    _openid: openid
  }).get()
  
  if (doubleCheck.data.length > 0) {
    console.log('⚠️ 并发检测到用户已存在')
    return {
      success: true,
      data: doubleCheck.data[0]
    }
  }
  
  // 确认不存在后才创建
  await db.collection('users').add({ data: newUser })
}
```

---

**创建时间**: 2025-12-16  
**脚本版本**: v1.0

