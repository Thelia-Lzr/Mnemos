#!/bin/bash

# 设置测试数据库的脚本

echo "🚀 启动测试数据库服务..."

# 启动Docker容器
docker-compose -f docker-compose.test.yml up -d

echo "⏳ 等待数据库服务启动..."

# 等待PostgreSQL启动
until docker exec ai-language-learning-postgres-test pg_isready -U postgres; do
  echo "等待PostgreSQL启动..."
  sleep 2
done

# 等待Redis启动
until docker exec ai-language-learning-redis-test redis-cli ping; do
  echo "等待Redis启动..."
  sleep 2
done

echo "✅ 测试数据库服务已启动！"
echo ""
echo "数据库连接信息:"
echo "  PostgreSQL: localhost:5433"
echo "  Redis: localhost:6380"
echo ""
echo "现在可以运行测试了:"
echo "  cd backend && npm run test:property"