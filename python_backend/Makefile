# Mnemos Python Backend Makefile

.PHONY: help check-python install install-dev dev run worker celery-beat test test-verbose test-cov test-unit test-integration test-property lint lint-fix format type-check db-migrate db-rollback db-clean init-db clean docker-up docker-down docker-clean setup-dev

# 默认目标
.DEFAULT_GOAL := help

PYTHON ?= venv/bin/python
PORT ?= 8000

help: ## 显示帮助信息
	@echo "Mnemos Python Backend - 可用命令:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

check-python: ## 检查 Python 虚拟环境
	@test -x $(PYTHON) || (echo "未找到 $(PYTHON)，请先创建虚拟环境" && exit 1)

install: check-python ## 安装依赖
	@echo "安装 Python 依赖..."
	$(PYTHON) -m pip install -r requirements.txt
	@echo "依赖安装完成"

install-dev: check-python ## 安装开发依赖
	@echo "安装开发依赖..."
	$(PYTHON) -m pip install -r requirements.txt
	$(PYTHON) -m pip install black ruff pre-commit pytest-cov mypy
	@echo "开发依赖安装完成"

dev: check-python ## 启动开发服务器
	@echo "启动开发服务器..."
	$(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port $(PORT)

run: check-python ## 启动生产服务器
	@echo "启动生产服务器..."
	$(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port $(PORT) --workers 4

worker: check-python ## 启动 Celery Worker
	@echo "启动 Celery Worker..."
	$(PYTHON) -m celery -A app.tasks.celery_app worker --loglevel=info

celery-beat: check-python ## 启动 Celery Beat
	@echo "启动 Celery Beat..."
	$(PYTHON) -m celery -A app.tasks.celery_app beat --loglevel=info

test: check-python ## 运行测试
	@echo "运行测试..."
	$(PYTHON) -m pytest

test-verbose: check-python ## 运行详细测试
	@echo "运行详细测试..."
	$(PYTHON) -m pytest -v

test-cov: check-python ## 运行测试并生成覆盖率报告
	@echo "运行测试并生成覆盖率报告..."
	$(PYTHON) -m pytest --cov=app --cov-report=html --cov-report=term-missing

test-unit: check-python ## 运行单元测试
	@echo "运行单元测试..."
	$(PYTHON) -m pytest tests/unit/

test-integration: check-python ## 运行集成测试
	@echo "运行集成测试..."
	$(PYTHON) -m pytest tests/integration/

test-property: check-python ## 运行属性测试
	@echo "运行属性测试..."
	$(PYTHON) -m pytest tests/property/

lint: check-python ## 检查代码风格
	@echo "检查代码风格..."
	$(PYTHON) -m ruff check app tests
	@echo "代码风格检查完成"

lint-fix: check-python ## 自动修复代码风格问题
	@echo "修复代码风格问题..."
	$(PYTHON) -m ruff check --fix app tests
	$(PYTHON) -m black app tests
	@echo "代码风格修复完成"

format: check-python ## 格式化代码
	@echo "格式化代码..."
	$(PYTHON) -m black app tests
	@echo "代码格式化完成"

type-check: check-python ## 类型检查
	@echo "类型检查..."
	$(PYTHON) -m mypy app
	@echo "类型检查完成"

db-migrate: check-python ## 运行数据库迁移
	@echo "运行数据库迁移..."
	$(PYTHON) -m alembic upgrade head

db-rollback: check-python ## 回滚数据库迁移
	@echo "回滚数据库迁移..."
	$(PYTHON) -m alembic downgrade -1

db-clean: check-python ## 清理数据库
	@echo "清理数据库..."
	$(PYTHON) -m alembic downgrade base

init-db: check-python ## 初始化数据库
	@echo "初始化数据库..."
	$(PYTHON) -m alembic upgrade head
	@echo "数据库初始化完成"

clean: ## 清理构建文件
	@echo "清理构建文件..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name "*.pyc" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	rm -rf dist/ build/ *.egg-info
	@echo "清理完成"

docker-up: ## 启动 Docker 容器（PostgreSQL + Redis）
	@echo "启动 Docker 容器..."
	docker compose -f ../docker-compose.yml up -d
	@echo "容器启动完成"

docker-down: ## 停止 Docker 容器
	@echo "停止 Docker 容器..."
	docker compose -f ../docker-compose.yml down
	@echo "容器停止完成"

docker-clean: ## 清理 Docker 容器和卷
	@echo "清理 Docker 容器和卷..."
	docker compose -f ../docker-compose.yml down -v
	@echo "清理完成"

setup-dev: install-dev init-db ## 完整开发环境设置
	@echo "开发环境设置完成"
