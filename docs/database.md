# 数据库结构说明

本文档说明小程序云开发数据库的集合结构和字段定义。

## 环境ID
- **环境ID**: `cloud1-7g62s1bob33a0a2c`

## 数据库集合

### 1. users（用户表）

存储用户基本信息和角色。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| _openid | String | 用户openid（系统自动生成） |
| role | String | 用户角色：'Boss'（老板）、'Staff'（员工）、'Admin'（管理员）、'SuperAdmin'（超级管理员） |
| nickname | String | 用户昵称 |
| avatar | String | 头像URL |
| userId | String | 用户ID（自定义，如：10086） |
| vipLevel | String | VIP等级（可选，用于老板） |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- _openid（唯一索引）

---

### 2. orders（订单表）

存储订单信息（无金额版本）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| _openid | String | 创建订单的员工openid |
| staffId | String | 员工openid |
| bossId | String | 老板openid |
| game | String | 游戏类型（如：'王者荣耀'） |
| duration | Number | 服务时长（小时） |
| date | String | 服务日期（格式：YYYY-MM-DD） |
| position | String | 游戏位置/角色（可选） |
| remark | String | 备注信息 |
| services | Array | 服务内容数组（如：['rank', 'voice']） |
| status | String | 订单状态：'pending'（待确认）、'confirmed'（已确认）、'completed'（已完成）、'cancelled'（已取消） |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- staffId
- bossId
- status
- date

---

### 3. reports（报备表）

存储员工报备记录。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| _openid | String | 提交报备的员工openid |
| staffId | String | 员工openid |
| bossId | String | 关联老板openid |
| date | String | 接单日期（格式：YYYY-MM-DD） |
| game | String | 游戏类型 |
| duration | Number | 服务时长（小时） |
| platform | String | 接单平台（如：'比心'） |
| services | Array | 服务内容数组 |
| remark | String | 备注说明 |
| images | Array | 订单截图URL数组（最多3张） |
| status | String | 审核状态：'pending'（待审核）、'approved'（已通过）、'rejected'（已驳回） |
| auditTime | Date | 审核时间 |
| auditorId | String | 审核人openid |
| auditRemark | String | 审核备注 |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- staffId
- bossId
| status

---

### 4. bindings（绑定关系表）

存储老板和员工的绑定关系。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| bossId | String | 老板openid |
| staffId | String | 员工openid |
| status | String | 状态：'active'（有效）、'inactive'（已解绑） |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |
| creatorId | String | 创建绑定关系的管理员openid |

**索引建议**：
- bossId
- staffId
- status
- 复合索引：(bossId, staffId, status)

---

### 5. roleChangeRequests（更换直属申请表）

存储老板申请更换直属员工的记录。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| _openid | String | 申请老板的openid |
| bossId | String | 老板openid |
| currentStaffId | String | 当前直属员工openid |
| targetStaffId | String | 目标员工openid |
| reason | String | 申请原因 |
| status | String | 审核状态：'pending'（待审核）、'approved'（已通过）、'rejected'（已驳回） |
| auditTime | Date | 审核时间 |
| auditorId | String | 审核人openid |
| auditRemark | String | 审核备注 |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- bossId
- status

---

### 6. content（内容管理表）

存储主页和推荐页的内容配置。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| type | String | 内容类型：'banner'（轮播图）、'notice'（公告）、'birthday'（生日祝福）、'gallery'（相册）、'recommend'（推荐） |
| title | String | 标题 |
| content | String | 内容文本 |
| images | Array | 图片URL数组 |
| order | Number | 排序序号 |
| status | String | 状态：'active'（启用）、'inactive'（禁用） |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- type
- status
- order

---

### 7. rankings（排行榜表）

存储员工排行榜数据（可按月/季度/年统计）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 系统自动生成 |
| staffId | String | 员工openid |
| period | String | 统计周期：'month'（本月）、'quarter'（本季度）、'year'（全年） |
| periodValue | String | 周期值（如：'2025-12'） |
| orderCount | Number | 订单数量 |
| totalDuration | Number | 总服务时长（小时） |
| rating | Number | 好评率（0-100） |
| rank | Number | 排名 |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

**索引建议**：
- staffId
- period
- periodValue
- 复合索引：(period, periodValue, rank)

---

## 创建数据库集合步骤

1. 登录微信开发者工具
2. 打开云开发控制台
3. 进入「数据库」页面
4. 点击「添加集合」
5. 依次创建以下集合：
   - `users`
   - `orders`
   - `reports`
   - `bindings`
   - `roleChangeRequests`
   - `content`
   - `rankings`

## 设置数据库权限

建议所有集合的权限设置为：
- **仅创建者可读写**（用于开发测试）
- 或根据业务需求设置自定义权限规则

## 初始化数据

### 创建第一个管理员用户

在云开发控制台的「数据库」中，手动在 `users` 集合中添加一条记录：

```json
{
  "_openid": "你的openid",
  "role": "SuperAdmin",
  "nickname": "超级管理员",
  "userId": "10001",
  "createTime": "2025-12-13T00:00:00.000Z",
  "updateTime": "2025-12-13T00:00:00.000Z"
}
```

**注意**：`_openid` 需要从云函数或小程序中获取，不能手动填写。建议先在小程序中登录，然后通过云函数获取openid。

## 云函数部署

1. 在微信开发者工具中，右键点击 `cloudfunctions` 目录下的每个云函数文件夹
2. 选择「上传并部署：云端安装依赖」
3. 等待部署完成

需要部署的云函数：
- `getUserInfo` - 获取用户信息
- `createOrder` - 创建订单
- `submitReport` - 提交报备
- `auditReport` - 审核报备
- `updateUserRole` - 更新用户角色
- `bindBossStaff` - 绑定老板和员工

## 注意事项

1. 所有涉及金额的字段已移除（根据PRD要求）
2. 订单状态流转：pending → confirmed → completed
3. 报备需要管理员审核：pending → approved/rejected
4. 绑定关系只能由管理员创建
5. 用户角色默认是 'Boss'，需要管理员修改
