# Mnemos Python Backend 启动指南

## 环境要求

- Python 3.11 或 3.12
- PostgreSQL 15+
- Redis 7+

## 安装步骤

### 1. 安装 pip

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3-pip python3-venv
```

**macOS:**
```bash
brew install python@3.12
```

### 2. 创建虚拟环境

```bash
cd python_backend
python3.12 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell 可使用 `py -3.12 -m venv .venv` 和 `.\.venv\Scripts\Activate.ps1`。

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置正确的配置
```

### 5. 初始化本地数据库

```bash
docker compose -f ../docker-compose.yml up -d --wait
alembic upgrade head
```

### 6. 启动服务

```bash
# 方式 1：使用 Makefile
make dev PYTHON=.venv/bin/python

# 方式 2：直接使用 uvicorn
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 7. 启动 Celery Worker（按需）

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

## 验证安装

访问以下地址验证服务是否正常运行：

- API 根路径：http://localhost:8000
- 健康检查：http://localhost:8000/health
- API 文档：http://localhost:8000/docs
- ReDoc 文档：http://localhost:8000/redoc

## 常见问题

### 1. 数据库连接失败

确保 PostgreSQL 运行在正确的端口（默认 5433）：
```bash
make docker-up  # 使用 Docker Compose 启动
```

### 2. Redis 连接失败

确保 Redis 运行在正确的端口（默认 6380）：
```bash
redis-cli -p 6380 ping
```

### 3. 端口被占用

修改 `.env` 文件中的 `PORT` 变量，或停止占用端口的服务。

## 运行测试

```bash
# 所有测试
pytest

# 单元测试
pytest tests/unit/

# 集成测试
pytest tests/integration/

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

## 代码质量

```bash
# 代码格式化
make format PYTHON=.venv/bin/python

# 代码风格检查
make lint PYTHON=.venv/bin/python

# 自动修复风格问题
make lint-fix PYTHON=.venv/bin/python
```
