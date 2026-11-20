# Mnemos 开发指南

Mnemos 是面向单个使用者的本地语言学习工作台。React 和 MUI 前端调用 FastAPI，学习数据和 AI 配置保存在 PostgreSQL，Celery 使用 Redis 处理后台任务。

## 规范与目录

- [需求](.kiro/specs/ai-language-learning-app/requirements.md) 定义工作台、提供方和回退队列的验收标准。
- [设计](.kiro/specs/ai-language-learning-app/design.md) 描述本地资料迁移、配置接口、密钥处理与 AI 调用流程。
- [实施记录](.kiro/specs/ai-language-learning-app/tasks.md) 记录当前工作台改动与早期功能的实现历史。
- 前端路由在 `frontend/src/App.tsx`，AI 配置页为 `/ai-settings`。后端入口为 `python_backend/app/main.py`，新数据库变更使用 Alembic 迁移。

## 工作台约定

- 工作台直接打开学习概览。业务请求通过 `get_workspace_user` 取得本地资料 ID，既有学习数据继续按 ID 关联。开发服务器和数据库服务使用回环地址。浏览器来源由 `CORS_ORIGIN` 控制。
- HTTP 与 Celery 的模型请求统一走 `app.services.ai_service`。新增 AI 功能时，同步更新后端 `AIFeature`、前端功能列表及规范。
- 每项功能可设置独立队列。空队列继承默认队列，有效队列按保存顺序尝试，首个成功结果结束本次调用。
- AI 配置通过版本号整体更新。API 读取只返回密钥是否存在，日志与错误响应避免记录密钥、请求体和 CLI 原始错误输出。
- Codex 和 Claude Code 适配器仅用于文本推理。保留临时工作目录、禁用工具的启动参数和超时清理。

## 开发和验证

- 使用 [README](README.md#-快速开始) 初始化依赖并启动本地服务。更新数据库后运行 `make db-migrate PYTHON_BIN=.venv/bin/python`。
- 在 `python_backend` 运行 `.venv/bin/python -m pytest`。在项目根目录运行 `npm --prefix frontend run build` 和 `npx playwright test tests/frontend-smoke.spec.ts`。
- 用本地模拟 Responses 服务和 CLI 验证失败回退。数据库迁移使用独立测试库，覆盖空库和已有资料的场景。
