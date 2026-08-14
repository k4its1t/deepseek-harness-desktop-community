# DeepSeek Harness Desktop

[English](README.md)

这是一个面向 macOS 和 Windows 的非官方、简易、开源 DeepSeek Harness 桌面客户端，复用官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 与 Agent 运行时。

应用会把固定版本的 `@deepseek-ai/dsh` 作为私有子进程启动，绑定到随机回环端口，再通过沙箱化 Electron 窗口显示官方 Web UI。最终用户不需要另外安装 Node.js 或 `dsh`。

> 本项目是独立社区项目，不是 DeepSeek 官方产品，也未得到 DeepSeek 的背书或隶属关系。

## 直接下载

| 平台 | 下载 |
| --- | --- |
| macOS Apple Silicon（M1/M2/M3/M4） | [下载 DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-0.3.1-macOS-arm64.dmg) |
| macOS Intel | [下载 DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-0.3.1-macOS-x64.dmg) |
| Windows x64 安装版 | [下载安装程序](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-0.3.1-Windows-x64-Setup.exe) |
| Windows x64 免安装版 | [下载便携 ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-0.3.1-Windows-x64-portable.zip) |
| 仅下载全部 3 个配套 Skill | [下载 Skill ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-Skills-0.3.1.zip) |

[查看完整 v0.3.1 发布说明与 SHA-256 校验](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/tag/v0.3.1)。macOS 产物已有完整 ad-hoc 完整性签名，但尚未使用 Apple Developer ID 签名和公证，请在安装前核对发布说明。

## 功能

- 官方 DeepSeek Harness Web UI 与 Agent 运行时
- macOS 和 Windows 安装包
- 复用现有 `~/.dsh` 设置、凭据、会话和 profiles
- 使用随机 `127.0.0.1` 端口，不暴露到局域网
- Renderer 开启 Chromium 沙箱，关闭 Node integration
- 复用原生目录选择器及平台相关 Harness 工具
- 桌面应用退出时自动清理运行时子进程
- 内置诊断与隐私安全的 Bug 报告 Skill

## 配套 Skills

桌面应用会打包 `.dsh/skills` 中的两个可选 Skill，并自动提供给内置 Harness：

- `/diagnose-harness-desktop`：安全、只读地诊断桌面启动、API、会话、Profile、工具、权限和打包问题。
- `/prepare-harness-bug-report`：把诊断证据脱敏整理成可复现的 GitHub Issue 草稿。

当本仓库是当前工作区时，DeepSeek Harness 也会自动发现源码副本。若要在其他 Harness 安装中使用，可复制到默认用户 Skill 目录：

```bash
# macOS
mkdir -p "$HOME/.dsh/skills"
cp -R .dsh/skills/* "$HOME/.dsh/skills/"
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force "$HOME\.dsh\skills"
Copy-Item -Recurse -Force .dsh\skills\* "$HOME\.dsh\skills\"
```

Skill 默认不读取或输出 API 密钥，也不会在未经用户明确同意时发送测试请求、修改配置或提交 GitHub Issue。`npm test` 会使用项目锁定的 DeepSeek Harness 解析器检查 Skill 的发现结果和元数据。

### 独立本地图片分析 Skill

`/analyze-images-locally` 会把用户指定的本地图片交给已安装的 Ollama 视觉模型生成结构化观察，再由当前纯文本 DeepSeek 模型继续推理。它适用于截图、照片、扫描文档、图表和流程图；若本机只安装了 Tesseract，则可降级为纯 OCR。

[下载 v0.3.1 全部配套 Skill ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.3.1/DeepSeek-Harness-Desktop-Skills-0.3.1.zip)。只需把压缩包内的 `analyze-images-locally` 文件夹解压到 `~/.dsh/skills`，重启 Harness，然后在调用时提供本地图片路径。该 Skill 不随桌面安装包分发，因为可选 Ollama 视觉模型需要另行下载数 GB 数据；未经同意不会安装或下载依赖，也不会使用云端视觉服务兜底。

## 当前发布状态

| 平台 | 产物 | 验证状态 |
| --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP | 已在真实桌面窗口中验证启动、现有 API 配置、会话及 Bash 工具调用 |
| macOS Intel | DMG / ZIP | 由 GitHub Actions 原生构建；需要在 Intel Mac 上做最终启动验证 |
| Windows x64 | NSIS 安装程序 / 便携 ZIP | 已由 Windows GitHub Actions 原生构建；仍需在实体 Windows 桌面做最终人工验证 |

仓库不包含签名证书。无证书的 macOS 构建会获得完整 ad-hoc 完整性签名，但 Gatekeeper 仍无法识别发布者；首次运行可能需要在 Finder 中右键选择“打开”，或前往“系统设置 → 隐私与安全性 → 仍要打开”。Windows 可能显示 SmartScreen 提示。详情参见 [macOS 签名与首次启动说明](docs/MACOS_SIGNING.md)。

## 开发运行

要求 Node.js 22 或更高版本。

```bash
git clone <你的仓库地址>
cd deepseek-harness-desktop-community
npm ci
npm start
```

首次运行会进入 DeepSeek Harness 标准引导流程。已经使用 CLI 的用户会自动复用 `~/.dsh`；也可以在启动应用前通过 `DSH_HOME` 指定其他位置。

## 测试

```bash
npm test
npm run smoke
```

Smoke test 会启动 Electron 和内置 Harness 运行时，等待 Web UI 成功渲染，输出 `DESKTOP_SMOKE_OK` 后退出。

## 构建安装包

```bash
# 在 macOS 上运行
npm run dist:mac

# 在 Windows 上运行
npm run dist:win
```

产物会写入 `release/`。GitHub Actions 会生成 macOS x64、macOS arm64 和 Windows x64 产物，并对两个 macOS 应用执行严格签名校验。未配置证书时使用完整 ad-hoc 签名；维护者日后可以只添加 Developer ID 与公证 Secrets，无需修改构建命令。配置方法参见 [docs/MACOS_SIGNING.md](docs/MACOS_SIGNING.md)，凭据绝不会写入仓库。

Windows 便携 ZIP 解压后可直接运行其中的 `DeepSeek Harness Desktop.exe`；NSIS `.exe` 安装程序应在 Windows 或仓库自带的 GitHub Actions 中生成。

## 日志与数据

通过 **File → Open Log Folder** 或 **File → Open DSH Data Folder** 打开目录。桌面壳只记录生命周期日志；常规数据仍由 DeepSeek Harness 保存在 `~/.dsh`。

## Vibe Coding 与贡献者

本项目采用 **Vibe Coding** 方式开发：由项目维护者提出目标、提供运行环境并确认发布方向，`Codex (OpenAI)` 协助完成实现、测试、跨平台打包、问题排查和文档整理。

完整贡献说明参见 [CONTRIBUTORS.md](CONTRIBUTORS.md)。使用 AI 辅助开发不改变本项目作为非官方社区包装的性质，发布者仍应负责审查代码、验证产物并评估使用风险。

## 安全设计

Web UI 只监听随机回环端口。Electron Renderer 使用 `contextIsolation`、Chromium sandbox，未启用 Node integration，也没有高权限 preload bridge。更多信息参见 [SECURITY.md](SECURITY.md)。

## 版本管理

`runtime/package.json` 中的 Harness 依赖采用精确版本锁定。升级前应检查上游变化并重新运行测试。

运行时在 `runtime/` 下使用独立 lockfile。这是有意设计：profile 插件采用动态加载，因此构建时会把完整生产依赖树作为未封装应用资源复制，避免被 Electron 的静态依赖打包器错误裁剪。

## 许可证

本桌面包装项目采用 MIT License。DeepSeek Harness 及其他依赖保留各自许可证，参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
