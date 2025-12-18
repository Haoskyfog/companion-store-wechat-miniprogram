# 🎮 陪玩店微信小程序

<div align="center">

![版本](https://img.shields.io/badge/版本-v2.1-blue)
![框架](https://img.shields.io/badge/框架-微信小程序-green)
![语言](https://img.shields.io/badge/语言-TypeScript-blue)
![AI辅助](https://img.shields.io/badge/AI辅助-Cursor-purple)
![状态](https://img.shields.io/badge/状态-稳定版-success)

**一个专业的游戏陪玩服务管理平台**

[📖 用户指南](./docs/USER_GUIDE.md) • [🚀 快速开始](#快速开始) • [📚 文档](#文档)

</div>

---

## 🤖 开发方式

> **Development with Cursor (AI-Assisted Workflow)**
> 
> 本项目在 [Cursor](https://cursor.sh/) AI代码编辑器的辅助下开发完成。Cursor 作为协作开发工具，而非代码生成器，帮助提升开发效率和代码质量。

---

## ✨ 项目特点

- 🎯 **三端分离**：老板端、员工端、管理员端各司其职
- 💎 **VIP体系**：11级VIP等级，专属主线故事
- 📊 **实时统计**：业务数据、排行榜、总流水
- 🎨 **现代设计**：亚克力玻璃、渐变色、流畅动画
- ❄️ **圣诞主题**：飘雪效果、节日氛围
- ☁️ **云开发**：无需服务器，开箱即用
- 🔒 **权限控制**：严格的角色权限管理

---

## 📸 功能预览

### 老板端
- ✨ 优雅的主页轮播与公告
- 🌟 精美的推荐页面
- 💎 VIP等级和主线故事
- 👥 直属员工展示
- 🎁 我的权益

### 员工端
- 📝 简洁的订单创建
- 📋 便捷的报备提交
- 🏆 直观的排行榜
- 👤 完善的资料管理

### 管理员端
- 📊 全面的数据仪表板
- 👥 强大的用户管理
- ✅ 高效的审核中心
- 📝 灵活的内容管理
- 🎁 权益编辑

---

## 🚀 快速开始

### 前置要求

- 微信开发者工具
- 微信小程序账号
- 微信云开发环境

### 部署步骤

1. **克隆项目**
```bash
git clone https://github.com/Haoskyfog/companion-store-wechat-miniprogram.git
```

2. **打开项目**
   - 使用微信开发者工具打开项目目录

3. **配置云开发**
   - 在 `app.ts` 中修改云环境ID为你的环境ID

4. **创建数据库集合**
```
users, orders, reports, bindings, roleChangeRequests, 
content, rankings, recharge_records, benefits
```

5. **部署云函数**
   - 右键云函数目录，选择"上传并部署：云端安装依赖"

6. **设置管理员**
   - 在数据库 `users` 集合中，将你的 `role` 改为 `SuperAdmin`

---

## 📦 项目结构

```
├── miniprogram/              # 小程序前端
│   ├── pages/
│   │   ├── boss/            # 老板端
│   │   ├── staff/           # 员工端
│   │   └── admin/           # 管理员端
│   ├── custom-tab-bar/      # 自定义TabBar
│   └── app.ts               # 入口文件
├── cloudfunctions/           # 云函数
├── docs/                     # 文档
└── prototype/                # HTML原型
```

---

## 💻 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | 微信小程序、TypeScript |
| 后端 | 微信云开发、Node.js |
| 数据库 | 云数据库 (NoSQL) |
| 存储 | 云存储 |
| 设计 | Glassmorphism、CSS3动画 |

---

## 📚 文档

- [📖 用户使用指南](./docs/USER_GUIDE.md)
- [⚡ 快速参考](./docs/QUICK_REFERENCE.md)
- [📋 产品需求文档](./docs/prd.md)
- [🗄️ 数据库文档](./docs/database.md)

---

## 📄 许可证

本项目采用 **CC BY-NC 4.0** 许可证。

- ✅ 允许：学习、个人使用、课程设计、毕业设计
- ❌ 禁止：商业使用、出售、二次收费

---

## 👤 开发者

**foggy_dream77**

- 微信：foggy_dream77
- 邮箱：lostinskyfog.dev@gmail.com

---

<div align="center">

**制作不易，感谢支持 ♥**

⭐ 如果这个项目对你有帮助，请给个 Star！

</div>
