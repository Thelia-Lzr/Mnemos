# Mnemos Python Backend Makefile

.PHONY: help install dev build test lint clean

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo "Mnemos Python Backend - 可用命令:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

install: ## 安装依赖
	@echo "安装 Python 依赖..."
	pip install -r requirements.txt
	@echo "依赖安装完成"

install-dev: ## 安装开发依赖
	@echo "安装开发依赖..."
	pip install -r requirements.txt
	pip install black ruff pre-commit pytest-cov
	@echo "开发依赖安装完成"

dev: ## 启动开发服务器
	@echo "启动开发服务器..."
	uvicorn app.main:app --reload --host 0.0.0.0 --port $(PORT)

run: ## 启动生产服务器
	@echo "启动生产服务器..."
	uvicorn app.main:app --host 0.0.0.0 --port $(PORT) --workers 4

worker: ## 启动 Celery Worker
	@echo "启动 Celery Worker..."
	celery -A app.tasks.celery_app worker --loglevel=info

celery-beat: ## 启动 Celery Beat
	@echo "启动 Celery Beat..."
	celery -A app.tasks.celery_app beat --loglevel=info

test: ## 运行测试
	@echo "运行测试..."
	pytest

test-verbose: ## 运行详细测试
	@echo "运行详细测试..."
	pytest -v

test-cov: ## 运行测试并生成覆盖率报告
	@echo "运行测试并生成覆盖率报告..."
	pytest --cov=app --cov-report=html --cov-report=term-missing

test-unit: ## 运行单元测试
	@echo "运行单元测试..."
	pytest tests/unit/

test-integration: ## 运行集成测试
	@echo "运行集成测试..."
	pytest tests/integration/

test-property: ## 运行属性测试
	@echo "运行属性测试..."
	pytest tests/property/

lint: ## 检查代码风格
	@echo "检查代码风格..."
	ruff check app tests
	@echo "代码风格检查完成"

lint-fix: ## 自动修复代码风格问题
	@echo "修复代码风格问题..."
	ruff check --fix app tests
	black app tests
	@echo "代码风格修复完成"

format: ## 格式化代码
	@echo "格式化代码..."
	black app tests
	@echo "代码格式化完成"

type-check: ## 类型检查
	@echo "类型检查..."
	mypy app
	@echo "类型检查完成"

db-migrate: ## 运行数据库迁移
	@echo "运行数据库迁移..."
	alembic upgrade head

db-rollback: ## 回滚数据库迁移
	@echo "回滚数据库迁移..."
	alembic downgrade -1

db-clean: ## 清理数据库
	@echo "清理数据库..."
	alembic downgrade base

init-db: ## 初始化数据库
	@echo "初始化数据库..."
	alembic upgrade head
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
	docker-compose up -d
	@echo "容器启动完成"

docker-down: ## 停止 Docker 容器
	@echo "停止 Docker 容器..."
	docker-compose down
	@echo "容器停止完成"

docker-clean: ## 清理 Docker 容器和卷
	@echo "清理 Docker 容器和卷..."
	docker-compose down -v
	@echo "清理完成"

setup-dev: install-dev init-db ## 完整开发环境设置
	@echo "开发环境设置完成"
