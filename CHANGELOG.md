# 更新日志 / Changelog

这里记录 DeepSeek Harness Desktop 的最新发布内容。项目采用 **Vibe Coding** 方式开发，维护者负责目标、素材选择与发布决策，**Codex (OpenAI)** 作为开发贡献者参与实现、测试、打包和文档整理。

## v0.3.0 — 2026-08-14

### 🐋 大肥鱼 icon 正式上岗

- 更新“大肥鱼”角色版应用图标，客户端终于有了一张辨识度拉满的新脸 (≧▽≦)。
- 提供 1024×1024 PNG、macOS 多分辨率 ICNS 与 Windows ICO。
- macOS 应用包、Windows 安装包、桌面窗口和启动页统一使用新图标。
- 删除旧紫色占位图标及未采用的黑鲸候选，仓库只保留当前正式视觉资源。
- 软件显示名称统一为 **DeepSeek Harness Desktop**。

### 🧩 3 个配套 Skill

- `/diagnose-harness-desktop`：以内置、只读方式检查启动、Web UI、API、会话、Profile、工具、权限与打包问题。
- `/prepare-harness-bug-report`：将诊断证据脱敏整理为可复现的 GitHub Issue 草稿，不会未经许可直接提交。
- `/analyze-images-locally`：通过用户已安装的 Ollama 视觉模型观察截图、照片、扫描件、图表和流程图，再将结构化结果交给纯文本 DeepSeek 模型分析；支持 Tesseract 纯 OCR 降级。
- 安装版自动发现两个内置 Skill；三个 Skill 同时提供独立 ZIP，方便安装到其他 Harness 环境。
- Skill 默认不输出 API 密钥；未经明确同意，不发送测试请求、不修改配置、不提交 Issue，也不会偷偷下载多 GB 模型。能帮忙，但不乱动 (￣▽￣)b。

### 🖥️ 桌面客户端能力

- 在原生 Electron 窗口中运行官方 DeepSeek Harness Web UI 与 Agent 运行时。
- 固定并内置 `@deepseek-ai/dsh` 生产依赖，用户无需另外安装 Node.js 或 `dsh`。
- 自动复用现有 `~/.dsh` 配置、API 凭据、会话和 Profile。
- 使用随机 `127.0.0.1` 回环端口，不把 Web UI 暴露到局域网。
- Renderer 启用 Chromium sandbox 与 `contextIsolation`，关闭 Node integration。
- 限制窗口导航和弹窗，外部网页交给系统浏览器处理。
- 应用退出时关闭 Harness 子进程，减少后台残留与端口占用。
- 支持 macOS Apple Silicon、macOS Intel 和 Windows x64 构建。

### 🧪 验证状态

- 7 项 Node.js 自动测试通过。
- JavaScript 语法检查通过。
- 3 个 Harness Skill 的发现、元数据、调用策略和资源校验通过。
- Apple Silicon macOS 应用重新打包成功。
- 从 `.app` 内 ICNS 反向提取的 1024px 图层与源 PNG 像素数据完全一致。
- 打包后的应用完成启动冒烟测试。
- npm 生产依赖审计为 0 个已知漏洞。

### 🎛️ 开发与发布说明

- 项目采用 **Vibe Coding**：维护者负责方向、环境和最终确认，**Codex (OpenAI)** 作为开发贡献者参与实现、测试、安全加固、跨平台打包、CI 排查与文档。
- 本项目是非官方社区项目，与 DeepSeek 没有隶属或背书关系。
- 发布产物尚未进行商业代码签名；macOS 可能需要右键选择“打开”，Windows 可能显示 SmartScreen 提示。
- GitHub Releases 只保留当前最新版本，避免旧安装包和过期说明继续分流用户。

完整发布说明参见 [`docs/releases/v0.3.0.md`](docs/releases/v0.3.0.md)。
