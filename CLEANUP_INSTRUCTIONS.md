# 清理订单和报备数据说明

## 功能说明
删除数据库中所有的订单和报备数据。

## 使用方法

### 方法1：在管理员面板中操作（推荐）
1. 登录管理员账号
2. 进入管理后台
3. 找到"🗑️ 清理数据"按钮（红色背景）
4. 点击后确认删除
5. 系统会显示删除结果

### 方法2：使用云函数直接调用
在小程序中调用云函数：
```javascript
wx.cloud.callFunction({
  name: 'cleanupAllData',
  success: (res) => {
    console.log('清理结果:', res.result)
  }
})
```

### 方法3：在微信开发者工具云控制台中运行脚本
1. 打开微信开发者工具
2. 进入云开发控制台
3. 在控制台中复制粘贴 `cleanup-all-orders-reports.js` 的内容
4. 运行脚本

## 警告

⚠️ **此操作不可恢复！**

删除操作会永久删除数据库中所有的：
- 订单数据（orders 集合）
- 报备数据（reports 集合）

删除前请确认：
- 已备份重要数据（如果需要）
- 确实需要清空所有数据
- 已通知相关人员

## 权限要求

只有 **管理员（Admin）** 或 **超级管理员（SuperAdmin）** 可以执行此操作。

## 文件说明

- `cleanup-all-orders-reports.js` - 可在云控制台直接运行的脚本
- `cloudfunctions/cleanupAllData/index.js` - 云函数版本（可在小程序中调用）
- `cloudfunctions/cleanupAllData/package.json` - 云函数配置文件

## 注意事项

1. **部署云函数**：如果使用方法1或2，需要先部署 `cleanupAllData` 云函数
2. **数据备份**：删除前建议先备份数据（如需要）
3. **批量删除**：脚本使用批量删除，每次删除20条，避免一次性删除过多数据
4. **操作日志**：删除操作会记录在云函数日志中

## 执行结果

清理完成后会返回：
- 删除的订单数量
- 删除的报备数量
- 如有错误，会显示错误信息

示例返回：
```json
{
  "success": true,
  "message": "清理完成：已删除 15 个订单和 8 个报备",
  "data": {
    "ordersDeleted": 15,
    "reportsDeleted": 8,
    "errors": []
  }
}
```
