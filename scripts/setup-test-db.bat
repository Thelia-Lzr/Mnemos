@echo off
REM 设置测试数据库的Windows批处理脚本

echo 🚀 启动测试数据库服务...

REM 启动Docker容器
docker-compose -f docker-compose.test.yml up -d

echo ⏳ 等待数据库服务启动...

REM 等待PostgreSQL启动
:wait_postgres
docker exec ai-language-learning-postgres-test pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo 等待PostgreSQL启动...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)

REM 等待Redis启动
:wait_redis
docker exec ai-language-learning-redis-test redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo 等待Redis启动...
    timeout /t 2 /nobreak >nul
    goto wait_redis
)

echo ✅ 测试数据库服务已启动！
echo.
echo 数据库连接信息:
echo   PostgreSQL: localhost:5433
echo   Redis: localhost:6380
echo.
echo 现在可以运行测试了:
echo   cd backend ^&^& npm run test:property