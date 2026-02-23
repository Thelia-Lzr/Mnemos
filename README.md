# 🌍 Mnemos- AI Language Learning Application

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18%2B-cyan?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Supported-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

一个由 AI 驱动的语言学习平台，提供个性化学习体验和实时交互功能。

[快速开始](#-快速开始) • [项目结构](#-项目结构) • [开发指南](#-开发指南) • [API 文档](#-api-文档)

</div>

---

## 📖 项目简介

Mnemos是一个全栈 AI 语言学习应用，集成了现代 Web 技术和人工智能能力。通过该平台，用户可以：

- 🎯 **个性化学习** - 基于 AI 的智能学习路径推荐
- 💬 **实时交互** - 通过 Socket.io 实现的实时聊天和反馈
- 📊 **进度追踪** - 详细的学习数据分析和能力评估
- 🔐 **安全认证** - JWT 认证和多层安全防护
- 💳 **支付管理** - 集成的支付和订阅系统
- 🎓 **测试评估** - 多种题型的考试和评估系统

---

## 🚀 快速开始

### 前提条件

在开始之前，确保你已安装：

- **Node.js** >= 14 (推荐 18+)
- **npm** >= 8
- **Docker** 和 **Docker Compose**
- **Git**

### 一键启动开发环境

```bash
# 1. 克隆项目
git clone https://github.com/Thelia-Lzr/Language-Helper.git
cd Language-Helper

# 2. 完整的开发环境初始化
make setup-dev

# 3. 启动后端 (终端 1)
make dev

# 4. 启动前端 (终端 2)
cd frontend && npm start
```

应用将在以下地址运行：

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 简单步骤

如果你更倾向于手动步骤：

```bash
# 安装依赖
make install

# 启动数据库容器
make docker-up

# 等待 5 秒，然后运行迁移
make db-migrate

# 在不同的终端启动应用
# 终端 1: 后端
make dev

# 终端 2: 前端
cd frontend && npm start
```

---

## 📁 项目结构

```
Language-Helper/
├── backend/                        # Node.js 后端应用
│   ├── src/
│   │   ├── server.ts              # 应用入口
│   │   ├── config/                # 配置文件 (数据库、Redis、迁移等)
│   │   ├── controllers/           # 请求处理器
│   │   ├── services/              # 业务逻辑
│   │   ├── models/                # 数据模型
│   │   ├── routes/                # API 路由
│   │   ├── middleware/            # Express 中间件
│   │   ├── types/                 # TypeScript 类型定义
│   │   └── utils/                 # 工具函数
│   ├── database/
│   │   ├── migrations/            # 数据库迁移文件
│   │   └── seeds/                 # 示例数据
│   ├── jest.config.js             # Jest 测试配置
│   └── package.json
│
├── frontend/                       # React 前端应用
│   ├── src/
│   │   ├── App.tsx                # 应用根组件
│   │   ├── components/            # React 组件
│   │   ├── pages/                 # 页面组件
│   │   ├── services/              # API 服务
│   │   ├── store/                 # Redux 状态管理
│   │   ├── types/                 # TypeScript 类型定义
│   │   └── utils/                 # 工具函数
│   ├── public/                    # 静态资源
│   └── package.json
│
├── database/                      # 共享数据库配置
│   ├── migrations/                # SQL 迁移脚本
│   └── seeds/                     # 示例数据脚本
│
├── docker-compose.yml             # 生产环境 Docker 配置
├── docker-compose.test.yml        # 测试环境 Docker 配置
├── Makefile                       # 开发命令集
└── README.md                      # 项目文档
```

---

## 🛠️ 可用命令

使用 `make help` 查看所有可用命令，或参考下表：

### 初始化和设置

```bash
make install              # 安装所有依赖
make setup-dev           # 完整的开发环境初始化
```

### 开发

```bash
make dev                 # 启动后端开发环境 (热重载)
make start               # 启动已构建的应用
```

### 构建

```bash
make build               # 构建后端和前端
make build-backend       # 仅构建后端
```

### 测试

```bash
make test                # 运行所有测试
make test-unit           # 运行单元测试
make test-unit-watch     # 运行单元测试 (监视模式)
make test-integration    # 运行集成测试
make test-property       # 运行属性测试
make test-coverage       # 生成测试覆盖率报告
```

### 代码质量

```bash
make lint                # 检查代码风格 (ESLint)
make lint-fix            # 自动修复代码风格问题
```

### 数据库

```bash
make docker-up           # 启动数据库容器
make docker-down         # 停止数据库容器
make docker-clean        # 删除容器和卷数据
make db-migrate          # 运行数据库迁移
make db-rollback         # 回滚数据库
make db-seed             # 填充示例数据
```

---

## 📚 开发指南

### 环境变量配置

创建 `.env` 文件在项目根目录和 `backend/` 目录：

```bash
# 项目根目录 .env
POSTGRES_DB=ai_language_learning
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# backend/.env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_language_learning
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
OPENROUTER_API_KEY=your_api_key_here
```

### 开发工作流程

1. **创建新功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **运行开发环境**
   ```bash
   make dev                    # 后端
   cd frontend && npm start    # 前端
   ```

3. **编写代码和测试**
   ```bash
   make test-unit             # 运行单元测试
   make lint-fix              # 自动修复代码风格
   ```

4. **提交和推送**
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   git push origin feature/your-feature-name
   ```

### 代码规范

- **TypeScript** - 严格类型检查
- **ESLint** - 代码风格检查
- **Jest** - 单元测试框架
- **Prettier** - 代码格式化 (通过 ESLint)

运行以下命令确保代码符合规范：

```bash
make lint-fix              # 自动修复
make test                  # 运行测试
```

### 数据库迁移

添加新的迁移文件到 `database/migrations/` 目录：

```bash
# 创建新迁移文件
# 格式: NNN_description.sql

# 运行迁移
make db-migrate

# 回滚迁移
make db-rollback
```

---

## 🧪 测试

项目包含完整的测试套件：

### 单元测试

```bash
make test-unit              # 运行一次
make test-unit-watch        # 监视模式
```

### 集成测试

```bash
make test-integration
```

### 属性测试 (Property-based Testing)

```bash
make test-property
```

### 测试覆盖率

```bash
make test-coverage          # 生成报告
open backend/coverage/index.html  # 查看报告
```

测试配置文件：
- `jest.config.js` - 主测试配置
- `jest.unit.config.js` - 单元测试配置
- `jest.property.config.js` - 属性测试配置

---

## 🐳 Docker 部署

### 本地开发

```bash
# 启动开发环境容器
make docker-up

# 停止容器
make docker-down

# 清理容器和数据
make docker-clean
```

### 生产部署

```bash
# 使用 docker-compose 部署
docker-compose -f docker-compose.yml up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

容器包括：
- **PostgreSQL 15** - 数据库服务
- **Redis 7** - 缓存和任务队列服务

---

## 🏗️ 项目架构

### 后端架构

- **框架**: Express.js
- **数据库**: PostgreSQL
- **缓存**: Redis (使用 Bull 处理任务队列)
- **认证**: JWT (JSON Web Tokens)
- **实时通信**: Socket.io
- **日志**: Winston
- **安全**: Helmet, Rate Limiting, CORS

### 前端架构

- **框架**: React 18
- **状态管理**: Redux Toolkit
- **UI 库**: Material-UI (MUI)
- **HTTP 客户端**: Axios
- **路由**: React Router v6
- **实时通信**: Socket.io-client

---

## 📡 API 文档

API 运行在 `http://localhost:8000`

主要端点：

### 认证
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新令牌

### 用户
- `GET /users/:id` - 获取用户信息
- `PUT /users/:id` - 更新用户信息

### 聊天
- `GET /chat/messages` - 获取聊天历史
- `POST /chat/messages` - 发送消息

### 练习
- `GET /practice/exercises` - 获取练习列表
- `POST /practice/submit` - 提交练习答案

### 词汇
- `GET /vocabulary/words` - 获取词汇列表

更详细的 API 文档请查看代码中的注释和路由定义。

---

## 🔧 故障排除

### 数据库连接失败

```bash
# 检查 Docker 容器是否运行
docker ps

# 检查环境变量
cat .env

# 重启容器
make docker-clean && make docker-up
```

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8000     # 后端
lsof -i :3000     # 前端
lsof -i :5432     # PostgreSQL
lsof -i :6379     # Redis

# 停止占用的进程
kill -9 <PID>
```

### 构建失败

```bash
# 清理所有依赖
make clean

# 重新安装
make install

# 重新构建
make build
```

### 测试失败

```bash
# 确保测试数据库容器运行
docker-compose -f docker-compose.test.yml up -d

# 等待数据库启动
sleep 5

# 运行测试
make test
```

---

## 📝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

请确保你的代码：
- ✅ 通过所有测试 (`make test`)
- ✅ 通过 linting 检查 (`make lint-fix`)
- ✅ 包含必要的测试
- ✅ 更新相关文档

---

## 📜 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

---

<div align="center">

**构建于** ❤️ **并使用现代 Web 技术**

⭐ 如果这个项目对你有帮助，请给个 Star！

</div>
