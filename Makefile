.PHONY: help check-python install init setup-dev dev start build build-backend test test-unit test-unit-watch test-integration test-property test-coverage lint lint-fix format db-migrate db-rollback db-seed docker-up docker-down docker-clean clean shutdown-dev

# 默认目标：显示帮助信息
.DEFAULT_GOAL := help

PY_BACKEND_DIR := python_backend
FRONTEND_DIR := frontend
PYTHON_BIN := venv/bin/python
PORT ?= 8000

# 颜色定义
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: 显示所有可用命令
help:
	@echo "$(BLUE)=== Mnemos - 可用命令 ===\n$(NC)"
	@echo "$(YELLOW)初始化和设置:$(NC)"
	@echo "  make install          - 安装所有依赖 (python_backend & frontend)"
	@echo "  make setup-dev        - 完整的开发环境初始化"
	@echo "  make init             - 初始化工作台数据库\n"
	@echo "$(YELLOW)开发:$(NC)"
	@echo "  make dev              - 启动 Python 后端开发服务"
	@echo "  make start            - 启动 Python 后端（关闭热重载）\n"
	@echo "$(YELLOW)构建:$(NC)"
	@echo "  make build            - 构建前端并检查后端可编译"
	@echo "  make build-backend    - 检查 Python 后端可编译\n"
	@echo "$(YELLOW)测试:$(NC)"
	@echo "  make test             - 运行 Python 后端所有测试"
	@echo "  make test-unit        - 运行单元测试"
	@echo "  make test-unit-watch  - 运行单元测试 (兼容别名，非监视)"
	@echo "  make test-integration - 运行集成测试"
	@echo "  make test-property    - 运行属性测试"
	@echo "  make test-coverage    - 运行测试并生成覆盖率报告\n"
	@echo "$(YELLOW)代码质量:$(NC)"
	@echo "  make lint             - 检查后端与前端代码风格"
	@echo "  make lint-fix         - 自动修复后端与前端代码风格\n"
	@echo "$(YELLOW)数据库:$(NC)"
	@echo "  make db-migrate       - 运行数据库迁移"
	@echo "  make db-rollback      - 回滚数据库"
	@echo "  make db-seed          - 填充示例数据\n"
	@echo "$(YELLOW)Docker:$(NC)"
	@echo "  make docker-up        - 启动数据库容器 (PostgreSQL + Redis)"
	@echo "  make docker-down      - 停止数据库容器"
	@echo "  make docker-clean     - 删除容器和卷数据\n"
	@echo "$(YELLOW)清理:$(NC)"
	@echo "  make clean            - 清理构建文件和依赖\n"

## check-python: 检查 Python 虚拟环境
check-python:
	@test -x $(PY_BACKEND_DIR)/$(PYTHON_BIN) || (echo "$(YELLOW)未找到 $(PY_BACKEND_DIR)/$(PYTHON_BIN)。请先进入 python_backend 创建并激活虚拟环境。$(NC)" && exit 1)

## install: 安装所有依赖
install: check-python
	@echo "$(BLUE)正在安装后端依赖...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pip install -r requirements.txt
	@echo "$(GREEN)✓ 后端依赖安装完成$(NC)"
	@echo "$(BLUE)正在安装前端依赖...$(NC)"
	cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✓ 前端依赖安装完成$(NC)"

## init: 初始化工作台数据库
init: db-migrate

## setup-dev: 完整的开发环境初始化
setup-dev: install docker-up db-migrate
	@echo "$(BLUE)等待数据库启动...$(NC)"
	@sleep 5
	@echo "$(GREEN)✓ 开发环境准备完成!$(NC)"
	@echo "$(YELLOW)运行以下命令启动开发环境:$(NC)"
	@echo "  终端1: make dev          (后端)"
	@echo "  终端2: cd frontend && npm start (前端)"

## dev: 启动后端开发环境
dev: check-python
	@echo "$(BLUE)启动后端开发环境...$(NC)"
	cd $(PY_BACKEND_DIR) && PORT=$(PORT) $(PYTHON_BIN) -m uvicorn app.main:app --reload --host 127.0.0.1 --port $(PORT)

## start: 启动 Python 后端（关闭热重载）
start: check-python
	@echo "$(BLUE)启动 Python 后端...$(NC)"
	cd $(PY_BACKEND_DIR) && PORT=$(PORT) $(PYTHON_BIN) -m uvicorn app.main:app --host 127.0.0.1 --port $(PORT)

## build: 构建后端和前端
build: build-backend
	@echo "$(BLUE)构建前端...$(NC)"
	cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✓ 构建完成$(NC)"

## build-backend: 仅构建后端
build-backend: check-python
	@echo "$(BLUE)构建后端...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m compileall -q app
	@echo "$(GREEN)✓ 后端构建完成$(NC)"

## test: 运行所有测试
test: check-python
	@echo "$(BLUE)运行所有测试...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pytest

## test-unit: 运行单元测试
test-unit: check-python
	@echo "$(BLUE)运行单元测试...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pytest tests/unit/

## test-unit-watch: 运行单元测试 (监视模式)
test-unit-watch: test-unit
	@echo "$(YELLOW)提示: Python 后端未内置 watch 模式，已执行一次单元测试。$(NC)"

## test-integration: 运行集成测试
test-integration: check-python
	@echo "$(BLUE)运行集成测试...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pytest tests/integration/

## test-property: 运行属性测试
test-property: check-python
	@echo "$(BLUE)运行属性测试...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pytest tests/property/

## test-coverage: 生成测试覆盖率报告
test-coverage: check-python
	@echo "$(BLUE)生成测试覆盖率报告...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m pytest --cov=app --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)✓ 覆盖率报告已生成 (查看: python_backend/htmlcov/index.html)$(NC)"

## lint: 检查代码风格
lint: check-python
	@echo "$(BLUE)检查代码风格...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m ruff check app tests
	cd $(FRONTEND_DIR) && npm run lint

## lint-fix: 自动修复代码风格问题
lint-fix: check-python
	@echo "$(BLUE)自动修复代码风格...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m ruff check --fix app tests
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m black app tests
	cd $(FRONTEND_DIR) && npm run lint:fix
	@echo "$(GREEN)✓ 修复完成$(NC)"

## format: 格式化 Python 代码
format: check-python
	@echo "$(BLUE)格式化后端代码...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m black app tests
	@echo "$(GREEN)✓ 格式化完成$(NC)"

## docker-up: 启动数据库容器
docker-up:
	@echo "$(BLUE)启动数据库容器 (PostgreSQL + Redis)...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ 容器已启动$(NC)"
	@echo "  PostgreSQL: localhost:5433"
	@echo "  Redis: localhost:6380"

## docker-down: 停止数据库容器
docker-down:
	@echo "$(BLUE)停止数据库容器...$(NC)"
	docker compose down
	@echo "$(GREEN)✓ 容器已停止$(NC)"

## docker-clean: 删除容器和卷数据
docker-clean:
	@echo "$(BLUE)删除容器和卷数据...$(NC)"
	docker compose down -v
	@echo "$(GREEN)✓ 已清理$(NC)"

## db-migrate: 运行数据库迁移
db-migrate: check-python
	@echo "$(BLUE)运行数据库迁移...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m alembic upgrade head
	@echo "$(GREEN)✓ 迁移完成$(NC)"

## db-rollback: 回滚数据库
db-rollback: check-python
	@echo "$(BLUE)回滚数据库...$(NC)"
	cd $(PY_BACKEND_DIR) && $(PYTHON_BIN) -m alembic downgrade -1
	@echo "$(GREEN)✓ 回滚完成$(NC)"

## db-seed: 填充示例数据
db-seed:
	@echo "$(BLUE)填充示例数据...$(NC)"
	cat database/seeds/001_sample_data.sql | docker compose exec -T postgres psql -U postgres -d ai_language_learning
	@echo "$(GREEN)✓ 数据填充完成$(NC)"

## clean: 清理构建文件和依赖
clean:
	@echo "$(BLUE)清理构建文件和依赖...$(NC)"
	rm -rf $(FRONTEND_DIR)/build
	rm -rf node_modules
	cd $(FRONTEND_DIR) && rm -rf node_modules
	cd $(PY_BACKEND_DIR) && find . -type d -name "__pycache__" -exec rm -rf {} +
	cd $(PY_BACKEND_DIR) && find . -type f -name "*.pyc" -delete
	cd $(PY_BACKEND_DIR) && rm -rf .pytest_cache htmlcov .coverage
	@echo "$(GREEN)✓ 清理完成$(NC)"

## shutdown-dev: 停止所有开发环境服务
shutdown-dev: docker-down
	@echo "$(GREEN)✓ 开发环境已关闭$(NC)"
