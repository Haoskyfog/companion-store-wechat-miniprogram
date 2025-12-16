# 🎮 Sonnet陪玩店小程序

<div align="center">

![版本](https://img.shields.io/badge/版本-v2.0-blue)
![框架](https://img.shields.io/badge/框架-微信小程序-green)
![语言](https://img.shields.io/badge/语言-TypeScript-blue)
![状态](https://img.shields.io/badge/状态-稳定版-success)

**一个专业的游戏陪玩服务管理平台**

[📖 用户指南](./docs/USER_GUIDE.md) • [🚀 快速开始](#快速开始) • [📚 文档](#文档) • [🐛 问题反馈](#问题反馈)

</div>

---

## ✨ 项目特点

- 🎯 **三端分离**：老板端、员工端、管理员端各司其职
- 💎 **VIP体系**：11级VIP等级，专属主线故事
- 📊 **实时统计**：业务数据、排行榜、总流水
- 🎨 **现代设计**：亚克力玻璃、渐变色、流畅动画
- ☁️ **云开发**：无需服务器，开箱即用
- 🔒 **权限控制**：严格的角色权限管理

---

## 📸 界面预览

### 老板端
- ✨ 优雅的主页轮播
- 🌟 精美的推荐页面
- 💎 VIP等级和主线故事
- 👥 直属员工展示

### 员工端
- 📝 简洁的订单创建
- 📋 便捷的报备提交
- 📊 直观的排行榜
- 👤 完善的资料管理

### 管理员端
- 📊 全面的数据仪表板
- 👥 强大的用户管理
- ✅ 高效的审核中心
- 📝 灵活的内容管理

---

## 🚀 快速开始

### 前置要求

- 微信开发者工具
- 微信小程序账号
- 微信云开发环境

### 5分钟快速部署

#### 步骤1: 打开项目

```bash
# 使用微信开发者工具打开项目目录
/Users/zhouhao/WeChatProjects/miniprogram-9
```

#### 步骤2: 配置云开发

1. 确认环境ID：`cloud1-7g62s1bob33a0a2c`
2. 或在 `app.ts` 中修改为你的环境ID

#### 步骤3: 创建数据库

在云开发控制台 → 数据库，创建以下集合：

```
✅ users              # 用户表
✅ orders             # 订单表
✅ reports            # 报备表
✅ bindings           # 绑定关系表
✅ roleChangeRequests # 更换申请表
✅ content            # 内容管理表
✅ rankings           # 排行榜表
✅ recharge_records   # 充值记录表
```

**设置数据库权限**：
- 读取：`true`
- 写入：`false`（只允许云函数写入）

#### 步骤4: 配置云存储

在云开发控制台 → 存储 → 权限设置：
- 读取：`true` ✅ **重要！图片显示需要此权限**
- 写入：`false`

#### 步骤5: 部署云函数

右键点击以下云函数，选择"上传并部署：云端安装依赖"：

**核心云函数**（必须部署）：
```
✅ getUserInfo        # 获取用户信息
✅ createOrder        # 创建订单
✅ confirmOrder       # 确认订单
✅ getOrders          # 获取订单列表
✅ submitReport       # 提交报备
✅ auditReport        # 审核报备
✅ getReports         # 获取报备列表（包含图片转换）
✅ manageBindings     # 绑定管理
✅ manageUsers        # 用户管理
✅ manageWallet       # 钱包管理
✅ getContent         # 获取内容（包含图片转换）
✅ updateContent      # 更新内容
✅ getStatistics      # 统计数据
✅ updateUserInfo     # 更新用户信息
```

#### 步骤6: 创建管理员账号

1. 使用微信账号登录小程序
2. 在云开发控制台 → 数据库 → `users` 集合
3. 找到你的用户记录（通过 `_openid` 识别）
4. 修改 `role` 字段为 `SuperAdmin`
5. 重新进入小程序

#### 步骤7: 开始使用

🎉 **完成！** 现在可以开始使用了！

- 管理员可以进入管理后台
- 创建用户、设置角色、建立绑定
- 配置主页内容和推荐员工

---

## 📚 文档

### 用户文档

- 📖 [**用户使用指南**](./docs/USER_GUIDE.md) - 详细的三端操作说明
- ⚡ [**快速参考卡片**](./docs/QUICK_REFERENCE.md) - 一页纸速查表

### 技术文档

- 📋 [**产品需求文档**](./docs/prd.md) - 业务逻辑和规则
- 🗄️ [**数据库文档**](./docs/database.md) - 数据结构说明
- 🧪 [**测试指南**](./TEST_INSTRUCTIONS.md) - 功能测试说明

---

## 🎯 核心功能

### 订单管理系统

- ✅ 员工创建订单（仅限绑定老板）
- ✅ 老板确认并支付
- ✅ 自动扣款和VIP升级
- ✅ 订单状态流转
- ✅ 客诉处理

### 报备审核系统

- ✅ 员工提交报备（可选任意老板）
- ✅ 上传订单截图
- ✅ 管理员审核
- ✅ 图片预览功能
- ✅ 审核结果通知

### 用户管理系统

- ✅ 角色管理（老板、员工、管理员）
- ✅ 绑定关系管理
- ✅ 用户信息编辑
- ✅ 头像上传

### 内容管理系统

- ✅ 轮播图管理
- ✅ 公告发布
- ✅ 生日祝福
- ✅ 相册管理
- ✅ 员工推荐配置

### 数据统计系统

- ✅ 用户统计
- ✅ 订单统计
- ✅ 总流水计算（真实金额累计）
- ✅ 排行榜
- ✅ VIP等级统计

---

## 💻 技术栈

### 前端

- **框架**: 微信小程序原生
- **语言**: TypeScript
- **UI库**: 自定义组件
- **状态管理**: 页面级状态

### 后端

- **云开发**: 微信云开发
- **云函数**: Node.js
- **数据库**: 云数据库（NoSQL）
- **云存储**: 图片和文件存储

### 设计系统

- **配色方案**: 紫蓝渐变色系
- **设计语言**: Glassmorphism（玻璃拟态）
- **动画**: CSS3 动画
- **图标**: Emoji + 自定义图标

---

## 📦 项目结构

```
miniprogram-9/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面目录
│   │   ├── boss/           # 老板端（主页、推荐、我的、订单等）
│   │   ├── staff/          # 员工端（创建订单、报备、排行榜等）
│   │   ├── admin/          # 管理员端（仪表板、用户、审核等）
│   │   └── profile/        # 公共页面（编辑资料）
│   ├── custom-tab-bar/     # 自定义TabBar
│   ├── utils/              # 工具函数
│   ├── app.ts              # 入口文件
│   └── app.json            # 配置文件
├── cloudfunctions/          # 云函数目录
│   ├── getUserInfo/        # 用户信息
│   ├── createOrder/        # 创建订单
│   ├── confirmOrder/       # 确认订单（含支付）
│   ├── getOrders/          # 获取订单列表
│   ├── submitReport/       # 提交报备
│   ├── auditReport/        # 审核报备
│   ├── getReports/         # 获取报备列表（含图片转换）
│   ├── manageBindings/     # 绑定管理
│   ├── manageUsers/        # 用户管理
│   ├── manageWallet/       # 钱包管理
│   ├── getContent/         # 获取内容（含图片转换）
│   ├── updateContent/      # 更新内容
│   ├── getStatistics/      # 统计数据
│   ├── getRankings/        # 排行榜
│   └── ...                 # 其他云函数
├── docs/                    # 文档目录
│   ├── README.md           # 项目说明
│   ├── USER_GUIDE.md       # 用户使用指南
│   ├── QUICK_REFERENCE.md  # 快速参考
│   ├── prd.md              # 产品需求
│   └── database.md         # 数据库文档
└── prototype/               # HTML原型页面
```

---

## 🔑 核心概念

### 三种角色

| 角色 | 权限 | 主要功能 |
|------|------|---------|
| **老板** | 服务接收方 | 查看推荐、确认订单、管理直属 |
| **员工** | 服务提供方 | 创建订单、提交报备、查看排名 |
| **管理员** | 系统管理员 | 用户管理、内容管理、审核功能 |

### 两种记录

| 类型 | 创建者 | 审核者 | 老板选择 | 涉及金额 |
|------|-------|--------|----------|---------|
| **订单** | 员工 | 老板确认 | 只能选绑定老板 | ✅ 有金额 |
| **报备** | 员工 | 管理员审核 | 可选任意老板 | ❌ 无金额 |

---

## 🛠️ 开发指南

### 添加新页面

1. 在 `miniprogram/pages` 下创建页面目录
2. 创建 `.wxml`、`.ts`、`.wxss`、`.json` 文件
3. 在 `app.json` 的 `pages` 数组中注册
4. 实现页面逻辑

### 添加新云函数

1. 在 `cloudfunctions` 下创建云函数目录
2. 创建 `index.js` 和 `package.json`
3. 实现云函数逻辑
4. 右键目录，上传并部署

### 数据库操作

```javascript
// 查询数据
const result = await db.collection('users')
  .where({ role: 'Boss' })
  .get()

// 添加数据
await db.collection('orders').add({
  data: { ... }
})

// 更新数据
await db.collection('users').doc(userId).update({
  data: { ... }
})
```

### 图片处理（重要！）

**在云函数中转换图片**：
```javascript
// 收集 cloud:// 图片
const cloudFileIds = images.filter(img => img.startsWith('cloud://'))

// 批量获取临时URL
const tempResult = await cloud.getTempFileURL({
  fileList: cloudFileIds
})

// 只使用 status === 0 的结果
const urlMap = {}
tempResult.fileList.forEach(file => {
  if (file.status === 0 && file.tempFileURL) {
    urlMap[file.fileID] = file.tempFileURL
  }
})

// 替换为 https:// URL
const convertedImages = images
  .map(img => img.startsWith('cloud://') ? urlMap[img] : img)
  .filter(img => img && img.startsWith('https://'))
```

---

## ⚙️ 配置说明

### 环境配置

**文件**: `app.ts`

```typescript
wx.cloud.init({
  env: 'cloud1-7g62s1bob33a0a2c',  // 修改为你的环境ID
  traceUser: true
})
```

### 数据库权限

```json
{
  "read": true,
  "write": false
}
```

### 云存储权限

```json
{
  "read": true,   // ⚠️ 必须开启，否则图片无法显示
  "write": false
}
```

---

## 🐛 问题反馈

### 常见问题

详见：[用户使用指南 - 常见问题](./docs/USER_GUIDE.md#常见问题)

### 技术问题排查

1. **查看云函数日志**
   - 云开发控制台 → 云函数 → 日志
   - 查看详细的错误信息和调试日志

2. **检查数据库数据**
   - 云开发控制台 → 数据库
   - 查看字段类型和值是否正确

3. **验证权限配置**
   - 数据库权限
   - 云存储权限
   - 云函数权限

---

## 📊 版本历史

### v2.0 (2025-12-16) - 重大更新

**修复**：
- ✅ 修复所有数据库查询方式错误
- ✅ 修复订单金额和总流水计算
- ✅ 修复报备图片显示问题
- ✅ 修复审核后数据不刷新
- ✅ 修复老板订单列表员工信息显示

**优化**：
- ✅ 老板确认订单自动支付
- ✅ 简化订单分类（全部、已支付、已取消）
- ✅ 员工报备可选任意老板
- ✅ 推荐页面现代化设计
- ✅ 图片在云函数中批量转换

**新增**：
- ✅ 报备图片上传和预览
- ✅ 直属员工头像显示
- ✅ 详细的调试日志
- ✅ 完整的用户文档

### v1.0 (初始版本)

- 基础三端功能
- 订单和报备系统
- 用户和绑定管理
- 内容管理
- 数据统计

---

## 🎯 roadmap

### 计划中的功能

- [ ] 实时消息通知
- [ ] 员工详情页优化
- [ ] 数据导出功能
- [ ] 高级筛选和搜索
- [ ] 批量操作支持
- [ ] 移动端适配优化

---

## 👥 团队

- **产品设计**: Sonnet Team
- **技术开发**: Sonnet Team
- **UI设计**: Sonnet Team

---

## 📄 许可证

本项目仅供学习和参考使用。

---

## 🙏 致谢

感谢以下技术和服务的支持：
- 微信小程序
- 微信云开发
- TypeScript
- 所有贡献者和用户

---

## 📞 联系我们

- **项目主页**: [GitHub地址]
- **问题反馈**: [Issue地址]
- **技术支持**: [联系方式]

---

<div align="center">

**Made with ❤️ by Sonnet Team**

**⭐ 如果这个项目对你有帮助，请给个Star！**

[返回顶部](#-sonnet陪玩店小程序)

</div>

---

**最后更新**: 2025-12-16  
**文档版本**: v2.0
