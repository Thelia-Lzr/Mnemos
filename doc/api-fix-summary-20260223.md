# API 设置与修复总结（2026-02-23）

## 1. 已完成设置

- 前端环境变量已设置为：
  - `REACT_APP_API_URL=http://localhost:8000/api`
  - 文件：`frontend/.env`
- 前端 Axios 基地址逻辑已增强（自动兼容是否包含 `/api`）：
  - 文件：`frontend/src/services/api.ts`
  - 行为：若 `REACT_APP_API_URL` 不以 `/api` 结尾，会自动补上。

## 2. 已完成修复（前端 -> 后端端点对齐）

### 2.1 已对齐到后端真实端点

- `frontend/src/services/paymentApi.ts`
  - `confirm-payment` -> `/payment/order/{orderId}/confirm`
  - `order-status/query-status` -> `/payment/order/{orderId}/status`
  - `cancel-order` -> `/payment/order/{orderId}/cancel`
  - `transaction/{id}` -> `/payment/order/{id}`（用于读取订单详情）

- `frontend/src/services/chatApi.ts`
  - 任务接口：
    - `/tasks/status/{id}` -> `/tasks/{id}/status`
    - `/tasks/result/{id}` -> `/tasks/{id}/result`
    - `/tasks/cancel/{id}` -> `/tasks/{id}/cancel`
  - 异步聊天调用改为复用当前存在的同步端点（避免 404）：
    - `message-async` -> `message`
    - `upload-material-async` -> `upload-material`
    - `function-call-async` -> `function-call`

- `frontend/src/services/userLanguageApi.ts`
  - 后端是基于 `language_id` 的 `PUT/DELETE`，前端原先按 `language` 调用。
  - 已改为：先从列表中找到对应语言记录，再用其 `id` 调用更新/删除/设为主语言。

- `frontend/src/services/vocabularyApi.ts`
  - `masteryLevel` 查询参数 -> `mastery_level`
  - `/submit-practice-results` -> `/submit-practice`
  - `/generate-adaptive-practice` -> `/generate-practice`
  - `update mastery` 请求体改为后端可识别字段（`mastery_score`）

- `frontend/src/services/dailyRecommendationApi.ts`
  - 与当前后端结构对齐：
    - `mark-viewed` -> `view`
    - `feedback` 增加 `recommendation_id`
    - `today/date/history` 按后端数组返回格式解析
  - 不存在的后端端点（`generate-async`、`quick-practice`）已改为可控降级逻辑。

- `frontend/src/services/practiceApi.ts`
  - 不存在的新式端点（如 `generate-ai-practice`、`generate-enhanced-practice`、批量删除、流式 followup 等）已改为：
    - 尽可能回退到已存在的 `/practice/generate-group` 或 `/practice/followup`
    - 后端确实未提供能力时抛出明确错误，避免静默 404

- `frontend/src/services/adminApi.ts`
  - 当前后端仅实现了部分 admin 端点（users/packages/statistics/credit-stats/credits-adjust）。
  - 对未实现的管理接口改为显式抛错（fail fast），避免请求不存在 URL。
  - `credit-statistics` 路径已改为后端实际：`/admin/credit-stats`。

## 3. 验证结果

### 3.1 端点审计

- 修复后自动审计输出：
  - `doc/api-audit-after-fix.json`
  - 结果：`total=51, matched=51, mismatched=0`

### 3.2 类型检查

- 对改动文件进行错误检查：
  - 结果：无错误（No errors found）

## 4. 产出文档

- 全量端点与引用核对文档（上一轮）
  - `doc/backend-endpoints-and-frontend-audit.md`
- 修复后审计 JSON
  - `doc/api-audit-after-fix.json`
- 本总结文档
  - `doc/api-fix-summary-20260223.md`

## 5. 仍需后端补齐（功能层面）

以下能力在当前 FastAPI 后端并未实现，因此前端已改为降级/显式报错：

- Admin OpenRouter 相关接口
- Admin 队列/任务运维接口
- Assessment reassessment 详情/提交/取消/历史接口
- Practice 的部分扩展能力（批量历史删除、结果详情、流式追问、部分 async 生成）
- Daily Recommendation quick-practice 与 async 生成

如需恢复这些前端功能，建议按此文档逐项补后端端点，再将前端降级逻辑切回正式调用。
