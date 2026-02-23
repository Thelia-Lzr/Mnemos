# Mnemos Python 后端重构计划

## 项目概述

将 Mnemos 后端从 Node.js/TypeScript 完整重构为 Python，保持与现有前端的完全兼容。

---

## 目标技术栈

| 功能 | Node.js | Python |
|------|---------|--------|
| Web 框架 | Express | FastAPI |
| ORM | 原生 SQL | SQLAlchemy 2.0 + asyncpg |
| 迁移 | 原生 SQL | Alembic |
| 验证 | express-validator | Pydantic |
| 认证 | jsonwebtoken | PyJWT |
| 加密 | bcrypt | bcrypt |
| 实时通信 | Socket.io | python-socketio |
| 任务队列 | Bull | Celery + Redis |
| HTTP 客户端 | axios | httpx |
| 日志 | winston | loguru |
| 测试 | Jest | pytest + pytest-asyncio |

---

## 项目结构

```
python_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # 配置管理
│   │   ├── security.py         # 认证、加密
│   │   ├── database.py         # DB 连接池
│   │   ├── redis.py            # Redis 连接
│   │   └── logging.py          # 日志配置
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/             # 13 个路由模块
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── chat.py
│   │   │   ├── practice.py
│   │   │   ├── vocabulary.py
│   │   │   ├── pk.py
│   │   │   ├── payment.py
│   │   │   ├── admin.py
│   │   │   ├── tasks.py
│   │   │   ├── daily_recommendations.py
│   │   │   ├── monitoring.py
│   │   │   ├── user_languages.py
│   │   │   └── assessment.py
│   │   ├── deps.py             # 依赖注入
│   │   └── error_handlers.py   # 错误处理
│   ├── models/                 # SQLAlchemy ORM 模型
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── chat_message.py
│   │   ├── practice.py
│   │   ├── vocabulary.py
│   │   ├── pk.py
│   │   ├── payment.py
│   │   └── ...
│   ├── schemas/                # Pydantic 模式
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── chat.py
│   │   ├── practice.py
│   │   ├── vocabulary.py
│   │   ├── pk.py
│   │   ├── payment.py
│   │   └── ...
│   ├── services/               # 业务逻辑
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── chat_service.py
│   │   ├── openrouter_service.py
│   │   ├── practice_service.py
│   │   ├── vocabulary_service.py
│   │   ├── pk_battle_service.py
│   │   ├── pk_matching_service.py
│   │   ├── payment_service.py
│   │   ├── daily_recommendation_service.py
│   │   └── ...
│   ├── tasks/                  # Celery 任务
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── chat_tasks.py
│   │   ├── practice_tasks.py
│   │   └── daily_recommendation_tasks.py
│   └── websocket/              # WebSocket 处理
│       ├── __init__.py
│       └── manager.py
├── alembic/
│   ├── versions/               # 迁移文件
│   └── ...
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   └── property/
├── .env
├── .env.example
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## 实施阶段

### 第一阶段：基础架构 (2-3 周)

**目标**: 搭建项目骨架，实现认证系统

**任务清单**:
- [ ] 创建项目结构和配置文件
- [ ] 实现配置管理 (config.py)
- [ ] 实现数据库连接 (database.py)
- [ ] 实现 Redis 连接 (redis.py)
- [ ] 实现日志系统 (logging.py)
- [ ] 实现 JWT 认证 (security.py)
- [ ] 实现加密工具 (security.py)
- [ ] 创建 SQLAlchemy 基础模型 (models/base.py)
- [ ] 创建 Pydantic 基础模式
- [ ] 实现 FastAPI 应用入口 (main.py)
- [ ] 实现中间件 (CORS、认证、日志)
- [ ] 实现错误处理器
- [ ] 实现健康检查端点
- [ ] 实现认证路由 (auth routes)
- [ ] 实现用户路由 (user routes)

**交付物**:
- 可运行的 FastAPI 应用
- 完整的认证系统（注册、登录、刷新 token）
- 用户管理 API

---

### 第二阶段：核心功能 (4-5 周)

**目标**: 实现聊天、练习、词汇、推荐系统

**任务清单**:

#### 聊天模块 (1 周)
- [ ] 创建 ChatMessage 模型
- [ ] 实现 OpenRouterService (AI 调用)
- [ ] 实现 ChatService
- [ ] 实现聊天路由
- [ ] 实现文件上传处理
- [ ] 实现意图识别
- [ ] 实现异步聊天任务

#### 练习模块 (1.5 周)
- [ ] 创建 PracticeGroup、Question、PracticeResult 模型
- [ ] 实现 PracticeGenerationService
- [ ] 实现 PracticeQuestionService
- [ ] 实现 PracticeAnalysisService
- [ ] 实现 PracticeEvaluationService
- [ ] 实现练习路由
- [ ] 实现 AI 分析生成
- [ ] 实现追问功能（支持 SSE 流式）

#### 词汇模块 (1 周)
- [ ] 创建 VocabularyWord 模型
- [ ] 实现 VocabularyService
- [ ] 实现 ForgettingCurveService
- [ ] 实现 VocabularyPracticeService
- [ ] 实现词汇路由
- [ ] 实现遗忘曲线逻辑
- [ ] 实现复习提醒

#### 每日推荐模块 (0.5 周)
- [ ] 创建 DailyRecommendation 模型
- [ ] 实现 DailyRecommendationService
- [ ] 实现推荐路由
- [ ] 实现异步推荐生成

**交付物**:
- 完整的 AI 聊天系统
- 练习生成和评估系统
- 词汇管理系统
- 每日学习推荐系统

---

### 第三阶段：高级功能 (3-4 周)

**目标**: 实现 PK 对战、支付、任务队列、评估系统

**任务清单**:

#### PK 对战模块 (1.5 周)
- [ ] 创建 PKBattle、BattleAnswer、UserMMR、MMRHistory 模型
- [ ] 实现 PKBattleService
- [ ] 实现 PKMatchingService
- [ ] 实现 MMRService
- [ ] 实现 PKRewardService
- [ ] 实现 PK 路由
- [ ] 实现 WebSocket 实时通信
- [ ] 实现 PK 调度器

#### 支付模块 (1 周)
- [ ] 创建 PaymentOrder、RechargePackage、CreditTransaction 模型
- [ ] 实现 PaymentService
- [ ] 实现 PaymentGatewayService
- [ ] 实现 CreditService
- [ ] 实现支付路由
- [ ] 实现积分系统

#### 任务队列模块 (0.5 周)
- [ ] 创建 AsyncTask 模型
- [ ] 配置 Celery
- [ ] 实现 TaskQueueManager
- [ ] 实现 TaskResultManager
- [ ] 实现任务路由

#### 评估模块 (1 周)
- [ ] 实现 UserCapability 模型
- [ ] 实现 UserCapabilityService
- [ ] 实现 AIAssessmentService
- [ ] 实现 ReassessmentService
- [ ] 实现评估路由
- [ ] 实现能力更新逻辑

**交付物**:
- 完整的 PK 对战系统（实时匹配、MMR 评级）
- 支付和积分系统
- 异步任务队列
- 能力评估系统

---

### 第四阶段：管理和监控 (2 周)

**目标**: 实现管理后台、系统监控、数据库优化

**任务清单**:
- [ ] 实现管理员路由
- [ ] 实现用户管理功能
- [ ] 实现套餐管理功能
- [ ] 实现 OpenRouter 配置管理
- [ ] 实现 MonitoringService
- [ ] 实现 DatabaseOptimizationService
- [ ] 实现 CacheService
- [ ] 实现监控路由
- [ ] 实现性能指标收集
- [ ] 实现告警系统

**交付物**:
- 完整的管理后台
- 系统监控和告警
- 性能优化

---

### 第五阶段：测试 (2-3 周)

**目标**: 实现完整的测试覆盖

**任务清单**:
- [ ] 配置 pytest
- [ ] 编写单元测试（所有 service 层）
- [ ] 编写集成测试（所有 API 端点）
- [ ] 编写 property-based 测试
- [ ] 编写端到端测试
- [ ] 配置 CI/CD
- [ ] 达到 80%+ 测试覆盖率

**交付物**:
- 完整的测试套件
- CI/CD 配置

---

### 第六阶段：并行运行和迁移 (2 周)

**目标**: 确保平滑迁移

**任务清单**:
- [ ] 配置两个后端并行运行
- [ ] 进行 API 兼容性测试
- [ ] 前端配置切换到新后端
- [ ] 金丝雀发布（10% 流量）
- [ ] 监控性能和错误
- [ ] 逐步增加流量到 100%

---

## 关键技术实现

### 1. JWT 认证兼容

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

确保与 Node.js 的 `jsonwebtoken` 库使用相同的算法（HS256）和密钥。

### 2. Socket.IO 兼容

使用 `python-socketio` 保持与前端相同的协议：

```python
import socketio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=['http://localhost:3000'])
app = FastAPI()
sio.mount(app)
```

### 3. Bull 队列迁移

使用 Celery 实现类似功能：

```python
from celery import Celery

celery_app = Celery(
    'mnemos',
    broker='redis://localhost:6380/0',
    backend='redis://localhost:6380/0'
)

@celery_app.task(bind=True, max_retries=3)
def generate_practice_task(self, user_id: str, params: dict):
    try:
        # 任务逻辑
        pass
    except Exception as exc:
        raise self.retry(exc, countdown=60)
```

### 4. SSE 流式响应

```python
from fastapi.responses import StreamingResponse
import asyncio

async def event_generator():
    for chunk in chunks:
        yield f"data: {chunk}\n\n"
        await asyncio.sleep(0.05)

@app.post("/practice/question/followup/stream")
async def followup_stream():
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### 5. 数据库连接池

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

---

## API 响应格式兼容

所有 API 响应保持与 Node.js 相同的格式：

```python
from pydantic import BaseModel
from typing import Optional, Any, Dict

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[str] = None
```

---

## 环境变量配置

```bash
# .env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5433/ai_language_learning
REDIS_URL=redis://localhost:6380/0
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret
OPENROUTER_API_KEY=your_api_key_here
CORS_ORIGIN=http://localhost:3000
DEFAULT_AI_MODEL=openai/gpt-4o
CELERY_BROKER_URL=redis://localhost:6380/0
CELERY_RESULT_BACKEND=redis://localhost:6380/0
```

---

## 依赖安装

```bash
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
celery==5.3.4
redis==5.0.1
python-socketio==5.10.0
httpx==0.25.2
loguru==0.7.2
pytest==7.4.3
pytest-asyncio==0.21.1
fast-check==3.16.0
```

---

## 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| API 响应格式不一致 | 高 | 严格遵循 Pydantic 模式，编写兼容性测试 |
| WebSocket 兼容性问题 | 高 | 使用 python-socketio 官方库，测试所有事件 |
| 性能下降 | 中 | 使用异步编程，优化数据库查询 |
| 团队学习曲线 | 中 | 提供培训，编写详细文档 |
| 数据迁移问题 | 低 | 数据库 schema 保持不变 |

---

## 成功标准

1. 所有 API 端点功能正常
2. 前端无需修改即可连接新后端
3. 测试覆盖率 > 80%
4. 性能指标达到或超过原 Node.js 版本
5. 零数据丢失
6. 平滑迁移，用户无感知
