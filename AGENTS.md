# Mnemos 开发指南

Mnemos 是免登录的浏览器语言学习工作台。React 与 MUI 实现界面，学习数据和 AI 配置通过 `frontend/src/local/db.ts` 写入 IndexedDB。

- 保持前端入口使用哈希路由，兼容 GitHub Pages 的项目子路径。
- AI 请求通过 `frontend/src/local/ai.ts` 发送。模型文本按普通文本或受限 Markdown 渲染，生成的题组和词条先验证结构。
- 本机 Codex 与 Claude Code 通过可选的 `bridge/server.mjs` 运行。桥接器保持回环绑定、来源和配对码校验、临时工作目录、工具禁用、超时和输出限制。
- 在修改前端后运行 `npm run build --prefix frontend`。修改桥接器后运行 `node --check bridge/server.mjs`。
