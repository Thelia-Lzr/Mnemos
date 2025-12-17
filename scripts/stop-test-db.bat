@echo off
REM 停止测试数据库服务的Windows批处理脚本

echo 🛑 停止测试数据库服务...

REM 停止并删除Docker容器
docker-compose -f docker-compose.test.yml down

echo ✅ 测试数据库服务已停止！