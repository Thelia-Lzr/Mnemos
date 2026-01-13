.PHONY: help install init dev build start test test-unit test-integration test-property test-coverage lint lint-fix format clean docker-up docker-down docker-clean db-migrate db-rollback db-seed setup-dev shutdown-dev

# 默认目标：显示帮助信息
.DEFAULT_GOAL := help

# 颜色定义
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: 显示所有可用命令
help:
	@echo "$(BLUE)=== Language Helper - 可用命令 ===\n$(NC)"
	@echo "$(YELLOW)初始化和设置:$(NC)"
	@echo "  make install          - 安装所有依赖 (backend & frontend)"
	@echo "  make setup-dev        - 完整的开发环境初始化"
	@echo "  make init             - 添加测试用户 (thelia@example.com / 123456)\n"
	@echo "$(YELLOW)开发:$(NC)"
	@echo "  make dev              - 启动开发环境 (后端 + 数据库)"
	@echo "  make start            - 启动已构建的应用\n"
	@echo "$(YELLOW)构建:$(NC)"
	@echo "  make build            - 构建后端和前端"
	@echo "  make build-backend    - 仅构建后端\n"
	@echo "$(YELLOW)测试:$(NC)"
	@echo "  make test             - 运行所有测试"
	@echo "  make test-unit        - 运行单元测试"
	@echo "  make test-unit-watch  - 运行单元测试 (监视模式)"
	@echo "  make test-integration - 运行集成测试"
	@echo "  make test-property    - 运行属性测试"
	@echo "  make test-coverage    - 运行测试并生成覆盖率报告\n"
	@echo "$(YELLOW)代码质量:$(NC)"
	@echo "  make lint             - 检查代码风格"
	@echo "  make lint-fix         - 自动修复代码风格问题\n"
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

## install: 安装所有依赖
install:
	@echo "$(BLUE)正在安装后端依赖...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd backend && npm install
	@echo "$(GREEN)✓ 后端依赖安装完成$(NC)"
	@echo "$(BLUE)正在安装前端依赖...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd frontend && npm install
	@echo "$(GREEN)✓ 前端依赖安装完成$(NC)"

## init: 添加测试用户
init:
	@echo "$(BLUE)添加测试用户...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd backend && npx ts-node scripts/create-test-user.ts
	@echo "$(GREEN)✓ 测试用户添加完成$(NC)"

## setup-dev: 完整的开发环境初始化
setup-dev: install docker-up
	@echo "$(BLUE)等待数据库启动...$(NC)"
	@sleep 5
	@echo "$(BLUE)运行数据库迁移...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd backend && npm run migrate:up
	@echo "$(GREEN)✓ 开发环境准备完成!$(NC)"
	@echo "$(YELLOW)运行以下命令启动开发环境:$(NC)"
	@echo "  终端1: make dev          (后端)"
	@echo "  终端2: cd frontend && npm start (前端)"

## dev: 启动后端开发环境
dev:
	@echo "$(BLUE)启动后端开发环境...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd backend && npm run dev

## start: 启动已构建的应用
start:
	@echo "$(BLUE)启动应用...$(NC)"
	export PATH=/usr/local/nodejs/bin:$$PATH && cd backend && npm start

## build: 构建后端和前端
build: build-backend
	@echo "$(BLUE)构建前端...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)✓ 构建完成$(NC)"

## build-backend: 仅构建后端
build-backend:
	@echo "$(BLUE)构建后端...$(NC)"
	cd backend && npm run build
	@echo "$(GREEN)✓ 后端构建完成$(NC)"

## test: 运行所有测试
test:
	@echo "$(BLUE)运行所有测试...$(NC)"
	cd backend && npm test

## test-unit: 运行单元测试
test-unit:
	@echo "$(BLUE)运行单元测试...$(NC)"
	cd backend && npm run test:unit

## test-unit-watch: 运行单元测试 (监视模式)
test-unit-watch:
	@echo "$(BLUE)运行单元测试 (监视模式)...$(NC)"
	cd backend && npm run test:unit:watch

## test-integration: 运行集成测试
test-integration:
	@echo "$(BLUE)运行集成测试...$(NC)"
	cd backend && npm run test:integration

## test-property: 运行属性测试
test-property:
	@echo "$(BLUE)运行属性测试...$(NC)"
	cd backend && npm run test:property

## test-coverage: 生成测试覆盖率报告
test-coverage:
	@echo "$(BLUE)生成测试覆盖率报告...$(NC)"
	cd backend && npm run test:coverage
	@echo "$(GREEN)✓ 覆盖率报告已生成 (查看: backend/coverage/index.html)$(NC)"

## lint: 检查代码风格
lint:
	@echo "$(BLUE)检查代码风格...$(NC)"
	cd backend && npm run lint

## lint-fix: 自动修复代码风格问题
lint-fix:
	@echo "$(BLUE)自动修复代码风格...$(NC)"
	cd backend && npm run lint:fix
	@echo "$(GREEN)✓ 修复完成$(NC)"

## docker-up: 启动数据库容器
docker-up:
	@echo "$(BLUE)启动数据库容器 (PostgreSQL + Redis)...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ 容器已启动$(NC)"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis: localhost:6379"

## docker-down: 停止数据库容器
docker-down:
	@echo "$(BLUE)停止数据库容器...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ 容器已停止$(NC)"

## docker-clean: 删除容器和卷数据
docker-clean:
	@echo "$(BLUE)删除容器和卷数据...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ 已清理$(NC)"

## db-migrate: 运行数据库迁移
db-migrate:
	@echo "$(BLUE)运行数据库迁移...$(NC)"
	cd backend && npm run migrate:up
	@echo "$(GREEN)✓ 迁移完成$(NC)"

## db-rollback: 回滚数据库
db-rollback:
	@echo "$(BLUE)回滚数据库...$(NC)"
	cd backend && npm run migrate:rollback
	@echo "$(GREEN)✓ 回滚完成$(NC)"

## db-seed: 填充示例数据
db-seed:
	@echo "$(BLUE)填充示例数据...$(NC)"
	cd backend && npm run db:seed
	@echo "$(GREEN)✓ 数据填充完成$(NC)"

## clean: 清理构建文件和依赖
clean:
	@echo "$(BLUE)清理构建文件和依赖...$(NC)"
	rm -rf backend/dist
	rm -rf frontend/build
	rm -rf node_modules
	cd backend && rm -rf node_modules
	cd frontend && rm -rf node_modules
	@echo "$(GREEN)✓ 清理完成$(NC)"

## shutdown-dev: 停止所有开发环境服务
shutdown-dev: docker-down
	@echo "$(GREEN)✓ 开发环境已关闭$(NC)"
