# 前后端接口对接盘点与修复计划（2026-02-23）

## 1. 目的与范围

本文档用于盘点 **当前前端（frontend/src）实际调用的 API** 与 **当前 Python 后端（python_backend/app/api/routes）已实现路由** 的对接情况，明确“哪些接口目前无法接上”，并给出可执行修复计划。

> 说明：本次比对以当前正在联调的 Python 后端为准（`http://localhost:8000/api`）。

---

## 2. 扫描方法（自动化）

- 扫描前端：提取 `api.get/post/put/delete/patch(...)` 与 `fetch('/api/...')` 调用。
- 扫描后端：提取每个路由文件的 `APIRouter(prefix=...)` + `@router.<method>(path)`。
- 比对规则：按 **HTTP Method + 路径模板** 匹配（支持 `{id}` 等动态段）。

统计结果：

- 前端唯一调用（Method + Path）：**83**
- Python 后端唯一路由（Method + Path）：**104**
- 未接通（缺失/不匹配）：**7**

---

## 3. 全量接口覆盖概览（按业务域）

| 业务域 | 前端调用数 | 未接通数 | 结论 |
|---|---:|---:|---|
| admin | 13 | 6 | 高风险，需优先修复 |
| assessment | 7 | 0 | 已接通 |
| auth | 4 | 0 | 已接通 |
| chat | 8 | 0 | 已接通 |
| monitoring | 3 | 0 | 已接通 |
| payment | 10 | 0 | 已接通 |
| pk | 9 | 1 | 局部不匹配 |
| practice | 8 | 0 | 已接通 |
| tasks | 3 | 0 | 已接通 |
| user-languages | 4 | 0 | 已接通 |
| users | 1 | 0 | 已接通 |
| vocabulary | 13 | 0 | 已接通 |

---

## 4. 当前无法接上的接口清单

### 4.1 Admin 任务队列（后端未实现）

1. `GET /api/admin/queue-metrics`
   - 前端来源：`frontend/src/components/Admin/TaskQueueManager.tsx`
2. `GET /api/admin/tasks`
   - 前端来源：`frontend/src/components/Admin/TaskQueueManager.tsx`
3. `POST /api/admin/retry-failed-tasks`
   - 前端来源：`frontend/src/components/Admin/TaskQueueManager.tsx`
4. `POST /api/admin/clear-queue`
   - 前端来源：`frontend/src/components/Admin/TaskQueueManager.tsx`

### 4.2 Admin 套餐管理写接口（后端未实现）

5. `PUT /api/admin/packages/{id}`
   - 前端来源：`frontend/src/components/Admin/PackageManager.tsx`
6. `DELETE /api/admin/packages/{id}`
   - 前端来源：`frontend/src/components/Admin/PackageManager.tsx`

### 4.3 PK 榜单接口路径协议不一致

7. `GET /api/pk/leaderboard`（前端当前调用形态）
   - 前端来源：`frontend/src/components/PK/PKLeaderboard.tsx`
   - Python 后端已实现：`GET /api/pk/leaderboard/{language}`
   - 结论：不是“完全缺失”，是 **路径契约不一致**。

---

## 5. 根因分类

### A. 后端能力缺口（缺路由）
- admin queue 相关 4 个端点。
- admin package 写操作 2 个端点。

### B. 前后契约不一致（路径设计不统一）
- PK leaderboard：前端用 query（`?language=`），后端用 path param（`/{language}`）。

---

## 6. 修复计划（按优先级）

## P0（当天可完成，先打通功能）

1. **统一 PK leaderboard 契约（推荐改前端）**
   - 将前端从 `GET /api/pk/leaderboard?language=xx` 改为 `GET /api/pk/leaderboard/{language}`。
   - 修改文件：`frontend/src/components/PK/PKLeaderboard.tsx`
   - 验收：PK 页无 404，榜单可加载。

2. **Admin 页面降级防护（避免“不可用即报错”）**
   - 对未实现的 queue / package 写接口增加“功能未开放”提示与 graceful fallback。
   - 修改文件：
     - `frontend/src/components/Admin/TaskQueueManager.tsx`
     - `frontend/src/components/Admin/PackageManager.tsx`
   - 验收：Admin 页可打开，控制台无未捕获异常。

## P1（本周完成，补齐后端能力）

3. **新增 Admin Queue 路由（Python 后端）**
   - 新增：
     - `GET /api/admin/queue-metrics`
     - `GET /api/admin/tasks`
     - `POST /api/admin/retry-failed-tasks`
     - `POST /api/admin/clear-queue`
   - 建议：先以最小可用版本返回结构化 mock/统计，再接真实队列实现。
   - 位置：`python_backend/app/api/routes/admin.py`（或拆分 `admin_tasks.py`）

4. **补齐 Admin Package 写接口（Python 后端）**
   - 新增：
     - `PUT /api/admin/packages/{package_id}`
     - `DELETE /api/admin/packages/{package_id}`
   - 注意：软删除/硬删除策略与现有 `isActive` 字段一致性。

## P2（稳定性与回归）

5. **接口契约固化**
   - 输出 OpenAPI/接口清单供前端消费。
   - 对前端服务层增加契约测试（最少覆盖 admin、pk、payment）。

6. **自动化联调门禁**
   - CI 增加“前端调用接口存在性检查”脚本（同本次扫描逻辑）。
   - 每次 PR 自动报告新增“未接通接口”。

---

## 7. 建议实施顺序

1. 前端先改 PK leaderboard 路径（低成本、立刻消除一个未接通）。
2. 前端为 Admin 未实现能力加降级提示（先保证可用性）。
3. 后端分两批补齐 admin queue + package 写接口。
4. 最后加契约检测与 CI 门禁，防止回归。

---

## 8. 验收标准

- Playwright 前端 smoke 全通过。
- 路由扫描中不再出现上述 7 个未接通端点。
- Admin 页面功能：读可用、写操作明确成功/失败语义，不出现 404 级联报错。
- PK 榜单请求 200，数据结构稳定。

---

## 9. 后续执行建议

如需，我可以按本计划直接进入下一步实现：

- 第一步：先提交 P0（PK 榜单路径修正 + Admin 降级处理）并回归测试。
- 第二步：再补 Python 后端 P1 路由，并提供最小可用响应与联调验证。