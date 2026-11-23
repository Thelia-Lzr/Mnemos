# Mnemos Python Backend 启动指南

## 环境要求

- Python 3.11+
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
brew install python3
```

### 2. 创建虚拟环境

```bash
cd python_backend
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置正确的配置
```

### 5. 启动服务

```bash
# 方式 1：使用 Makefile
make dev

# 方式 2：直接使用 uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. 启动 Celery Worker（可选）

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
make format

# 代码风格检查
make lint

# 自动修复风格问题
make lint-fix
```

## 欢迎页与个人 OpenRouter 密钥

在后端 `.env` 设置 `AI_CREDENTIAL_ENCRYPTION_KEY`，并执行
`make db-migrate` 创建个人密钥表。可用以下命令生成独立的加密密钥：

```bash
python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

保留此加密密钥，并在同一部署的各后端实例中使用相同的值，以便读取已保存的个人密钥。
已配置个人密钥时，学习请求优先使用它，并发送到官方 OpenRouter API。也可以配置原有的
`OPENROUTER_API_KEY` 作为服务器默认密钥。
