# 后端端点清单与前端引用核对

生成时间：2026-02-23T09:49:52.888Z

## 1) `/auth/login` 为什么访问不到

- 当前 FastAPI 路由统一使用 `/api` 前缀。
- 登录端点真实路径是：`POST /api/auth/login`。
- 直接访问 `/auth/login` 会 404（缺少 `/api`）。
- 另外，前端 `api.ts` 默认基地址是 `http://localhost:3001/api`，而你当前后端运行在 `:8000`。若未设置 `REACT_APP_API_URL`，请求会打到错误端口。

## 2) 后端端点总览（来自 OpenAPI）

- 后端端点总数：**104**

### /

| Method | Path | 作用 |
|---|---|---|
| GET | `/` | 根路径 |
| GET | `/health` | 健康检查端点 |

### /api/admin

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/admin/credit-stats` | 获取积分统计 |
| GET | `/api/admin/packages` | 获取所有套餐（包括非激活） |
| POST | `/api/admin/packages` | 创建套餐 |
| GET | `/api/admin/statistics` | 获取系统统计 |
| GET | `/api/admin/users` | 获取用户列表 |
| GET | `/api/admin/users/{user_id}` | 获取用户详情 |
| POST | `/api/admin/users/{user_id}/credits/adjust` | 调整用户积分 |

### /api/assessment

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/assessment/capabilities` | 获取所有能力 |
| POST | `/api/assessment/capability` | 创建能力 |
| GET | `/api/assessment/capability/{language}` | 获取能力 |
| PUT | `/api/assessment/capability/{language}` | 更新能力 |
| POST | `/api/assessment/comprehensive` | 综合评估 |
| GET | `/api/assessment/history/{language}` | 获取评估历史 |
| POST | `/api/assessment/reassessment` | 发起再评估 |

### /api/auth

| Method | Path | 作用 |
|---|---|---|
| POST | `/api/auth/change-password` | 修改密码 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/profile` | 获取当前用户资料 |
| POST | `/api/auth/refresh` | 刷新访问令牌 |
| POST | `/api/auth/register` | 用户注册 |

### /api/chat

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/chat/available-functions` | 获取可用函数列表 |
| POST | `/api/chat/function-call` | 执行函数调用 |
| DELETE | `/api/chat/history` | 清空聊天历史 |
| GET | `/api/chat/history` | 获取聊天历史 |
| POST | `/api/chat/message` | 发送聊天消息 |
| POST | `/api/chat/parse-intent` | 解析用户意图 |
| GET | `/api/chat/search` | 搜索消息 |
| POST | `/api/chat/upload-material` | 上传学习材料 |

### /api/daily-recommendations

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/daily-recommendations/{language}/date/{target_date}` | 获取指定日期推荐 |
| POST | `/api/daily-recommendations/{language}/feedback` | 提交反馈 |
| POST | `/api/daily-recommendations/{language}/generate` | 生成推荐 |
| GET | `/api/daily-recommendations/{language}/history` | 获取推荐历史 |
| GET | `/api/daily-recommendations/{language}/today` | 获取今日推荐 |
| POST | `/api/daily-recommendations/{language}/view` | 标记已查看 |

### /api/monitoring

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/monitoring/alerts` | 获取警报列表 |
| PATCH | `/api/monitoring/alerts/{alert_id}/resolve` | 解决警报 |
| GET | `/api/monitoring/cache/stats` | 获取缓存统计 |
| GET | `/api/monitoring/database/stats` | 获取数据库统计 |
| GET | `/api/monitoring/health` | 健康检查 |
| GET | `/api/monitoring/metrics` | 获取系统指标 |

### /api/payment

| Method | Path | 作用 |
|---|---|---|
| POST | `/api/payment/create-order` | 创建支付订单 |
| GET | `/api/payment/credits` | 获取积分余额 |
| GET | `/api/payment/methods` | 获取支付方式列表 |
| GET | `/api/payment/order/{order_id}` | 获取订单详情 |
| POST | `/api/payment/order/{order_id}/cancel` | 取消订单 |
| POST | `/api/payment/order/{order_id}/confirm` | 确认支付 |
| GET | `/api/payment/order/{order_id}/status` | 获取订单状态 |
| GET | `/api/payment/package/{package_id}` | 获取套餐详情 |
| GET | `/api/payment/packages` | 获取充值套餐列表 |
| GET | `/api/payment/transactions` | 获取交易历史 |
| POST | `/api/payment/webhook` | 处理支付网关 webhook 回调 注意：此端点不需要认证，由支付网关调用 |

### /api/pk

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/pk/battle/{battle_id}` | 获取对战信息 |
| POST | `/api/pk/battle/{battle_id}/answer` | 提交答案 |
| POST | `/api/pk/battle/{battle_id}/finish` | 结束对战 |
| POST | `/api/pk/battle/{battle_id}/start` | 开始对战 |
| POST | `/api/pk/cancel-match` | 取消匹配 |
| POST | `/api/pk/find-match` | 寻找 PK 对手 |
| GET | `/api/pk/history` | 获取对战历史 |
| GET | `/api/pk/leaderboard/{language}` | 获取排行榜 |
| GET | `/api/pk/match-status` | 获取匹配状态 |
| GET | `/api/pk/mmr-history` | 获取 MMR 历史 |
| GET | `/api/pk/mmr/{language}` | 获取用户 MMR |
| GET | `/api/pk/stats` | 获取 PK 统计 |

### /api/practice

| Method | Path | 作用 |
|---|---|---|
| POST | `/api/practice/followup` | 练习追问 |
| POST | `/api/practice/generate-group` | 生成练习组 |
| DELETE | `/api/practice/group/{group_id}` | 删除练习组 |
| GET | `/api/practice/group/{group_id}` | 获取练习组详情 |
| POST | `/api/practice/group/{group_id}/analyze` | 生成练习分析（这个端点可能需要调整，因为分析是基于 result 而不是 group） |
| POST | `/api/practice/group/{group_id}/submit` | 提交练习答案 |
| GET | `/api/practice/groups` | 获取练习组列表 |
| GET | `/api/practice/history` | 获取练习历史 |
| POST | `/api/practice/result/{result_id}/analyze` | 生成练习结果分析 |

### /api/tasks

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/tasks/{task_id}` | 获取任务详情 |
| POST | `/api/tasks/{task_id}/cancel` | 取消任务 |
| GET | `/api/tasks/{task_id}/result` | 获取任务结果 |
| GET | `/api/tasks/{task_id}/status` | 获取任务状态 |
| GET | `/api/tasks/user` | 获取用户任务列表 |

### /api/user-languages

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/user-languages` | 获取用户语言列表 |
| POST | `/api/user-languages` | 添加用户语言 |
| DELETE | `/api/user-languages/{language_id}` | 删除用户语言 |
| PUT | `/api/user-languages/{language_id}` | 更新用户语言设置 |

### /api/users

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/users/admin/all` | 获取所有用户（管理员） |
| POST | `/api/users/capabilities` | 创建用户能力记录 |
| GET | `/api/users/capabilities/{language}` | 获取指定语言的能力 |
| PUT | `/api/users/capabilities/{language}` | 更新用户能力 |
| GET | `/api/users/learning-status` | 获取用户学习状态 |
| PUT | `/api/users/profile` | 更新用户资料 |

### /api/vocabulary

| Method | Path | 作用 |
|---|---|---|
| POST | `/api/vocabulary/add-word` | 添加单个单词 |
| POST | `/api/vocabulary/add-words` | 从文本中添加单词 |
| POST | `/api/vocabulary/apply-daily-decay` | 应用每日遗忘衰减 |
| GET | `/api/vocabulary/forgetting-curve-metrics` | 获取遗忘曲线指标 |
| POST | `/api/vocabulary/generate-practice` | 生成词汇练习 |
| GET | `/api/vocabulary/learning-efficiency-metrics` | 获取学习效率指标 |
| GET | `/api/vocabulary/mastery-stats` | 获取掌握度统计 |
| POST | `/api/vocabulary/optimize-review-schedule` | 优化复习计划 |
| GET | `/api/vocabulary/review-reminders` | 获取复习提醒 |
| GET | `/api/vocabulary/scheduled-reviews` | 获取 scheduled reviews |
| POST | `/api/vocabulary/submit-practice` | 提交词汇练习结果 |
| DELETE | `/api/vocabulary/word/{word_id}` | 删除单词 |
| PUT | `/api/vocabulary/word/{word_id}/mastery` | 更新单词掌握程度 |
| GET | `/api/vocabulary/words` | 获取词汇列表 |
| GET | `/api/vocabulary/words-needing-review` | 获取需要复习的单词 |

## 3) 前端引用核对结果

- 前端调用总数：**85**
- 匹配后端：**39**
- 不匹配：**46**

### 按文件统计

| 文件 | 匹配/总数 | 结论 |
|---|---:|---|
| `frontend/src/pages/AuthPage.tsx` | 1/1 | ✅ 全匹配 |
| `frontend/src/services/adminApi.ts` | 6/23 | ⚠️ 17 处不匹配 |
| `frontend/src/services/assessmentApi.ts` | 6/8 | ⚠️ 2 处不匹配 |
| `frontend/src/services/chatApi.ts` | 7/12 | ⚠️ 5 处不匹配 |
| `frontend/src/services/paymentApi.ts` | 4/10 | ⚠️ 6 处不匹配 |
| `frontend/src/services/practiceApi.ts` | 5/16 | ⚠️ 11 处不匹配 |
| `frontend/src/services/userLanguageApi.ts` | 3/6 | ⚠️ 3 处不匹配 |
| `frontend/src/services/vocabularyApi.ts` | 7/9 | ⚠️ 2 处不匹配 |

### 不匹配明细（需要修正）

| 文件 | 调用 | 归一化后路径 |
|---|---|---|
| `frontend/src/services/adminApi.ts` | `POST /admin/clear-queue` | `POST /api/admin/clear-queue` |
| `frontend/src/services/adminApi.ts` | `GET /admin/credit-statistics` | `GET /api/admin/credit-statistics` |
| `frontend/src/services/adminApi.ts` | `GET /admin/failed-tasks` | `GET /api/admin/failed-tasks` |
| `frontend/src/services/adminApi.ts` | `GET /admin/openrouter/config` | `GET /api/admin/openrouter/config` |
| `frontend/src/services/adminApi.ts` | `PUT /admin/openrouter/config` | `PUT /api/admin/openrouter/config` |
| `frontend/src/services/adminApi.ts` | `GET /admin/openrouter/models` | `GET /api/admin/openrouter/models` |
| `frontend/src/services/adminApi.ts` | `POST /admin/openrouter/test-key` | `POST /api/admin/openrouter/test-key` |
| `frontend/src/services/adminApi.ts` | `GET /admin/openrouter/usage-stats` | `GET /api/admin/openrouter/usage-stats` |
| `frontend/src/services/adminApi.ts` | `PUT /admin/packages/${id}` | `PUT /api/admin/packages/{}` |
| `frontend/src/services/adminApi.ts` | `DELETE /admin/packages/${id}` | `DELETE /api/admin/packages/{}` |
| `frontend/src/services/adminApi.ts` | `GET /admin/queue-metrics` | `GET /api/admin/queue-metrics` |
| `frontend/src/services/adminApi.ts` | `POST /admin/retry-failed-tasks` | `POST /api/admin/retry-failed-tasks` |
| `frontend/src/services/adminApi.ts` | `GET /admin/revenue-stats` | `GET /api/admin/revenue-stats` |
| `frontend/src/services/adminApi.ts` | `GET /admin/tasks` | `GET /api/admin/tasks` |
| `frontend/src/services/adminApi.ts` | `GET /admin/usage-stats` | `GET /api/admin/usage-stats` |
| `frontend/src/services/adminApi.ts` | `GET /admin/user-stats` | `GET /api/admin/user-stats` |
| `frontend/src/services/adminApi.ts` | `GET /admin/users/${userId}/credits` | `GET /api/admin/users/{}/credits` |
| `frontend/src/services/assessmentApi.ts` | `GET /assessment/reassessment-history/${language}` | `GET /api/assessment/reassessment-history/{}` |
| `frontend/src/services/assessmentApi.ts` | `GET /assessment/reassessment/${reassessmentId}` | `GET /api/assessment/reassessment/{}` |
| `frontend/src/services/chatApi.ts` | `POST /chat/function-call-async` | `POST /api/chat/function-call-async` |
| `frontend/src/services/chatApi.ts` | `POST /chat/message-async` | `POST /api/chat/message-async` |
| `frontend/src/services/chatApi.ts` | `POST /tasks/cancel/${taskId}` | `POST /api/tasks/cancel/{}` |
| `frontend/src/services/chatApi.ts` | `GET /tasks/result/${taskId}` | `GET /api/tasks/result/{}` |
| `frontend/src/services/chatApi.ts` | `GET /tasks/status/${taskId}` | `GET /api/tasks/status/{}` |
| `frontend/src/services/paymentApi.ts` | `POST /payment/cancel-order/${orderId}` | `POST /api/payment/cancel-order/{}` |
| `frontend/src/services/paymentApi.ts` | `POST /payment/confirm-payment` | `POST /api/payment/confirm-payment` |
| `frontend/src/services/paymentApi.ts` | `GET /payment/order-status/${orderId}` | `GET /api/payment/order-status/{}` |
| `frontend/src/services/paymentApi.ts` | `GET /payment/query-status/${orderId}` | `GET /api/payment/query-status/{}` |
| `frontend/src/services/paymentApi.ts` | `POST /payment/retry-payment/${orderId}` | `POST /api/payment/retry-payment/{}` |
| `frontend/src/services/paymentApi.ts` | `GET /payment/transaction/${transactionId}` | `GET /api/payment/transaction/{}` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-ai-practice` | `POST /api/practice/generate-ai-practice` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-ai-practice-async` | `POST /api/practice/generate-ai-practice-async` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-comprehensive` | `POST /api/practice/generate-comprehensive` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-enhanced-practice` | `POST /api/practice/generate-enhanced-practice` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-enhanced-practice-async` | `POST /api/practice/generate-enhanced-practice-async` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/generate-group-async` | `POST /api/practice/generate-group-async` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/group/followup` | `POST /api/practice/group/followup` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/question/followup` | `POST /api/practice/question/followup` |
| `frontend/src/services/practiceApi.ts` | `GET /practice/result/${practiceResultId}/analysis` | `GET /api/practice/result/{}/analysis` |
| `frontend/src/services/practiceApi.ts` | `GET /practice/result/${practiceResultId}/detail` | `GET /api/practice/result/{}/detail` |
| `frontend/src/services/practiceApi.ts` | `POST /practice/vocabulary-group` | `POST /api/practice/vocabulary-group` |
| `frontend/src/services/userLanguageApi.ts` | `GET /user-languages/${language}` | `GET /api/user-languages/{}` |
| `frontend/src/services/userLanguageApi.ts` | `POST /user-languages/${language}/primary` | `POST /api/user-languages/{}/primary` |
| `frontend/src/services/userLanguageApi.ts` | `GET /user-languages/primary` | `GET /api/user-languages/primary` |
| `frontend/src/services/vocabularyApi.ts` | `POST /vocabulary/generate-adaptive-practice` | `POST /api/vocabulary/generate-adaptive-practice` |
| `frontend/src/services/vocabularyApi.ts` | `POST /vocabulary/submit-practice-results` | `POST /api/vocabulary/submit-practice-results` |

## 4) 关键问题结论

- 认证：`AuthPage.tsx` 使用 `api.post('/auth/login')` 是**相对 `baseURL` 正确**的；但必须保证 `baseURL` 指向 `http://localhost:8000/api`（或 `http://localhost:8000` + 调用改为 `/api/auth/login`）。
- 任务接口：前端存在 `/tasks/status/{id}`、`/tasks/result/{id}`、`/tasks/cancel/{id}`，后端实际是 `/api/tasks/{task_id}/status`、`/api/tasks/{task_id}/result`、`/api/tasks/{task_id}/cancel`。
- 多个业务模块（`practice`/`payment`/`admin`/`assessment`/`user-languages`/`vocabulary`）存在旧接口名或路径结构不一致，详见上表。

## 5) 建议的最小修复

1. 在 `frontend/.env` 设置：`REACT_APP_API_URL=http://localhost:8000/api`。
2. 先修复认证与任务相关路径（影响登录后核心流程）。
3. 按“不匹配明细”逐条对齐，或在后端加兼容路由（短期兜底）。
