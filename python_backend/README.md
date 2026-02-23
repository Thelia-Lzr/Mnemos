# Mnemos Python Backend

Mnemos 是一个全栈 AI 驱动的语言学习应用，这是 Python 版本的后端实现。

## 技术栈

- **Web 框架**: FastAPI
- **数据库**: PostgreSQL + SQLAlchemy (async)
- **缓存**: Redis
- **认证**: JWT (python-jose)
- **任务队列**: Celery
- **实时通信**: python-socketio
- **AI 集成**: OpenRouter API (httpx)

## 快速开始

### 1. 环境要求

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

或使用 Poetry:

```bash
poetry install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置正确的数据库连接和 API 密钥
```

### 4. 初始化数据库

```bash
# 从原 Node.js 后端迁移数据库
# 运行 SQL 迁移文件
psql -h localhost -p 5433 -U postgres -d ai_language_learning -f ../backend/database/migrations/001_initial_schema.sql
# ... 运行其他迁移文件
```

### 5. 启动服务

```bash
# 开发模式
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 6. 启动 Celery Worker

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

## 项目结构

```
python_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── core/                   # 核心配置
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── redis.py
│   │   ├── security.py
│   │   └── logging_config.py
│   ├── api/
│   │   ├── routes/             # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # 认证路由
│   │   │   ├── users.py        # 用户路由
│   │   │   ├── chat.py         # 聊天路由
│   │   │   ├── practice.py     # 练习路由
│   │   │   ├── vocabulary.py   # 词汇路由
│   │   │   ├── pk.py           # PK 对战路由
│   │   │   ├── payment.py      # 支付路由
│   │   │   ├── assessment.py   # 评估路由
│   │   │   ├── daily_recommendations.py  # 每日推荐路由
│   │   │   ├── tasks.py        # 任务路由
│   │   │   ├── monitoring.py   # 监控路由
│   │   │   ├── admin.py        # 管理员路由
│   │   │   └── user_languages.py  # 用户语言路由
│   │   ├── deps.py             # 依赖注入
│   │   └── error_handlers.py   # 错误处理
│   ├── models/                 # SQLAlchemy 模型
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── chat_message.py
│   │   ├── practice.py
│   │   ├── vocabulary.py
│   │   ├── pk.py
│   │   ├── payment.py
│   │   ├── task.py
│   │   ├── recommendation.py
│   │   └── assessment.py
│   ├── schemas/                # Pydantic 模式
│   ├── services/               # 业务逻辑
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── chat_service.py
│   │   ├── practice_service.py
│   │   ├── vocabulary_service.py
│   │   ├── pk_battle_service.py
│   │   ├── payment_service.py
│   │   ├── daily_recommendation_service.py
│   │   └── openrouter_service.py
│   ├── tasks/                  # Celery 任务
│   │   ├── celery_app.py
│   │   ├── chat_tasks.py
│   │   ├── practice_tasks.py
│   │   └── daily_recommendation_tasks.py
│   └── websocket/              # WebSocket 处理
│       └── manager.py
├── alembic/                    # 数据库迁移
├── tests/                      # 测试
│   ├── unit/
│   └── integration/
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户资料
- `PUT /api/auth/change-password` - 修改密码

### 用户
- `GET /api/users/profile` - 获取个人资料
- `PUT /api/users/profile` - 更新个人资料
- `PUT /api/users/preferences` - 更新偏好设置
- `GET /api/users/learning-status` - 获取学习状态
- `GET /api/users/capabilities` - 获取语言能力

### 聊天
- `POST /api/chat/message` - 发送消息
- `POST /api/chat/upload-material` - 上传学习材料
- `GET /api/chat/history` - 获取聊天历史
- `DELETE /api/chat/history` - 清空聊天历史
- `GET /api/chat/search` - 搜索消息
- `POST /api/chat/function-call` - 执行函数调用
- `POST /api/chat/parse-intent` - 解析用户意图

### 练习
- `POST /api/practice/generate-group` - 生成练习组
- `GET /api/practice/groups` - 获取练习组列表
- `GET /api/practice/group/:id` - 获取练习组详情
- `POST /api/practice/group/:id/submit` - 提交练习答案
- `GET /api/practice/history` - 获取练习历史
- `POST /api/practice/group/:id/analyze` - 生成练习分析
- `POST /api/practice/result/:id/analyze` - 生成结果分析
- `POST /api/practice/followup` - 练习追问
- `DELETE /api/practice/group/:id` - 删除练习组

### 词汇
- `GET /api/vocabulary/words` - 获取词汇列表
- `POST /api/vocabulary/add-word` - 添加单个单词
- `POST /api/vocabulary/add-words` - 从文本添加单词
- `DELETE /api/vocabulary/word/:id` - 删除单词
- `PUT /api/vocabulary/word/:id/mastery` - 更新掌握程度
- `GET /api/vocabulary/mastery-stats` - 获取掌握度统计
- `GET /api/vocabulary/words-needing-review` - 获取需要复习的单词
- `POST /api/vocabulary/apply-daily-decay` - 应用每日遗忘衰减
- `POST /api/vocabulary/generate-practice` - 生成词汇练习
- `POST /api/vocabulary/submit-practice` - 提交词汇练习

### PK 对战
- `POST /api/pk/find-match` - 寻找匹配
- `POST /api/pk/cancel-match` - 取消匹配
- `GET /api/pk/match-status` - 获取匹配状态
- `GET /api/pk/battle/:id` - 获取对战信息
- `POST /api/pk/battle/:id/start` - 开始对战
- `POST /api/pk/battle/:id/answer` - 提交答案
- `POST /api/pk/battle/:id/finish` - 结束对战
- `GET /api/pk/history` - 获取对战历史
- `GET /api/pk/mmr/:language` - 获取用户 MMR
- `GET /api/pk/leaderboard/:language` - 获取排行榜
- `GET /api/pk/stats` - 获取 PK 统计

### 支付
- `GET /api/payment/packages` - 获取充值套餐列表
- `GET /api/payment/package/:id` - 获取套餐详情
- `POST /api/payment/create-order` - 创建支付订单
- `GET /api/payment/order/:id` - 获取订单详情
- `GET /api/payment/order/:id/status` - 获取订单状态
- `POST /api/payment/order/:id/confirm` - 确认支付
- `POST /api/payment/order/:id/cancel` - 取消订单
- `GET /api/payment/transactions` - 获取交易历史
- `GET /api/payment/credits` - 获取积分余额
- `GET /api/payment/methods` - 获取支付方式
- `POST /api/payment/webhook` - 处理支付网关回调

### 评估
- `GET /api/assessment/capabilities` - 获取所有能力
- `POST /api/assessment/capability` - 创建能力
- `GET /api/assessment/capability/:language` - 获取能力
- `PUT /api/assessment/capability/:language` - 更新能力
- `POST /api/assessment/comprehensive` - 综合评估
- `GET /api/assessment/history/:language` - 评估历史
- `POST /api/assessment/reassessment` - 发起再评估

### 每日推荐
- `GET /api/daily-recommendations/:language/today` - 今日推荐
- `GET /api/daily-recommendations/:language/date/:date` - 指定日期推荐
- `POST /api/daily-recommendations/:language/generate` - 生成推荐
- `POST /api/daily-recommendations/:language/view` - 标记已查看
- `POST /api/daily-recommendations/:language/feedback` - 提交反馈
- `GET /api/daily-recommendations/:language/history` - 推荐历史

### 任务
- `GET /api/tasks/user` - 获取用户任务列表
- `GET /api/tasks/:taskId` - 获取任务详情
- `GET /api/tasks/:taskId/status` - 获取任务状态
- `GET /api/tasks/:taskId/result` - 获取任务结果
- `POST /api/tasks/:taskId/cancel` - 取消任务

### 监控
- `GET /api/monitoring/health` - 健康检查
- `GET /api/monitoring/metrics` - 获取系统指标
- `GET /api/monitoring/alerts` - 获取警报列表
- `PATCH /api/monitoring/alerts/:id/resolve` - 解决警报
- `GET /api/monitoring/database/stats` - 获取数据库统计
- `GET /api/monitoring/cache/stats` - 获取缓存统计

### 管理员
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/:id` - 获取用户详情
- `GET /api/admin/statistics` - 获取系统统计
- `GET /api/admin/packages` - 获取套餐管理
- `POST /api/admin/packages` - 创建套餐
- `GET /api/admin/credit-stats` - 获取积分统计
- `POST /api/admin/users/:id/credits/adjust` - 调整用户积分

### 用户语言
- `GET /api/user-languages` - 获取用户语言列表
- `POST /api/user-languages` - 添加语言
- `PUT /api/user-languages/:id` - 更新语言设置
- `DELETE /api/user-languages/:id` - 移除语言

### 其他
- `GET /health` - 健康检查
- `GET /` - API 根路径信息
- `GET /docs` - Swagger API 文档
- `GET /redoc` - ReDoc API 文档

## 测试

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

## 开发注意事项

1. **数据库连接**: 确保 PostgreSQL 运行在端口 5433
2. **Redis 连接**: 确保 Redis 运行在端口 6380
3. **环境变量**: 所有敏感配置都应通过环境变量设置
4. **CORS**: 确保 `CORS_ORIGIN` 与前端地址匹配

## 与原 Node.js 后端的差异

- 使用 FastAPI 替代 Express
- 使用 SQLAlchemy ORM 替代原生 SQL
- 使用 Celery 替代 Bull 任务队列
- 使用 python-socketio 保持 WebSocket 兼容
- API 响应格式保持一致，前端无需修改

## License

MIT
