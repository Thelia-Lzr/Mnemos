# Mnemos

Mnemos 是一个免登录的语言学习工作台，支持英语、日语和法语。学习资料、对话记录、词汇、答题结果和 AI 配置保存在当前浏览器的 IndexedDB 中。

## 开发

需要 Node.js 22 或更新版本。

```bash
npm ci --prefix frontend
npm start --prefix frontend
```

网页启动后，从欢迎页点击「进入学习」。你可以先跳过 AI 设置，直接使用本地自测、词汇复习和学习记录。清除站点数据会移除当前浏览器保存的资料。

## AI 提供方

- **OpenRouter**：填写模型 ID 和自己的 API 密钥。
- **OpenAI 兼容 API**：填写 HTTPS 基础地址和模型 ID。服务需要提供 Chat Completions，并允许浏览器从站点来源发送 CORS 请求。需要认证时填写 Bearer 密钥。
- **本机 Codex / Claude Code**：安装并登录对应 CLI，随后在本机启动桥接器。使用支持本地网络访问的浏览器，并在提示时允许站点访问回环地址。

```bash
node bridge/server.mjs --origin https://thelia-lzr.github.io
```

开发站点可以改用 `--origin http://localhost:3000`。在「AI 设置」中选择对应 CLI，填入桥接器终端显示的配对码。桥接器每次重启都会生成新码。CLI 模型 ID 留空时使用其默认模型。桥接器只绑定本机回环地址，用临时目录运行禁用工具的文本推理。CLI 仍通过其已登录的模型服务发送学习提示和相应的对话上下文。

## GitHub Pages

在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。推送到 `develop` 会运行 `pages.yml`，也可以在 Actions 中手动运行。静态产物只包含 React 应用，桥接器由需要使用本机 CLI 的学习者单独启动。应用使用哈希路由，在项目子路径下刷新学习页面也可以继续访问。

```bash
npm run build --prefix frontend
```
