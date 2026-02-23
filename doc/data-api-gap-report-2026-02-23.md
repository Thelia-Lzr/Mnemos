# 数据接口缺口清单（2026-02-23）

## 目标
- 禁止前端通过“伪造默认值”兜底来掩盖后端缺口。
- 所有页面应由后端提供真实、可追溯的数据。

## 本次改动（已完成）
- 已将系统监控页改为严格消费后端结构，不再在前端构造虚假监控数据。
- 已补齐并规范化监控接口返回：
  - `GET /api/monitoring/health`
  - `GET /api/monitoring/alerts?limit=50`
  - `PATCH /api/monitoring/alerts/{alert_id}/resolve`

## 当前扫描结果
- 扫描方式：前端 `api.get/post/put/patch/delete` 调用路径与 Python 后端路由声明比对。
- 结果：未发现确定性的“缺失数据接口”。
- 备注：`/user-languages` 在自动扫描中出现 1 条可疑项，已人工确认后端存在 `APIRouter(prefix="/api/user-languages")`，属于扫描器对空子路径处理造成的误报。

## 监控接口结构约束（强约束）

### `GET /api/monitoring/health`
返回：
```json
{
  "success": true,
  "data": {
    "status": "healthy|degraded|critical",
    "timestamp": "ISO8601",
    "uptime": 12345,
    "services": {
      "database": {"status":"...","message":"...","lastCheck":"ISO8601","responseTime":1.23},
      "redis": {"status":"...","message":"...","lastCheck":"ISO8601","responseTime":0.52},
      "memory": {"status":"...","message":"...","lastCheck":"ISO8601","responseTime":null},
      "cpu": {"status":"...","message":"...","lastCheck":"ISO8601","responseTime":null}
    },
    "metrics": {
      "activeConnections": 5,
      "memoryUsage": 72.4,
      "cpuUsage": 16.8,
      "responseTime": 0.88,
      "errorRate": 0.0
    }
  }
}
```

### `GET /api/monitoring/alerts?limit=50`
返回：
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "error|warning|info",
      "service": "string",
      "message": "string",
      "timestamp": "ISO8601",
      "resolved": false,
      "metadata": {}
    }
  ]
}
```

## 后续新增接口模板（若未来出现真实缺口时使用）
1. 在 `python_backend/app/api/routes/` 新建或扩展路由。
2. 强制返回统一结构：`{ success: boolean, data: ... }`。
3. 禁止返回前端无法消费的“半结构化对象”；字段名必须与前端类型定义一致。
4. 在对应前端 service 层去除默认兜底，改为结构校验失败即抛错（便于尽早发现后端契约偏差）。
5. 用 Playwright 做页面级回归，确认目标页 `API>=400` 与 `console error` 为 0。
