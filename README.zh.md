# DeepSeek Harness Desktop

<p align="center">
  <img src="build/icon.png" width="128" alt="DeepSeek Harness Desktop 大肥鱼图标">
</p>

<p align="center">把 DeepSeek Harness 装进一个可下载、可启动、可带走的 macOS / Windows 桌面窗口。</p>

<p align="center">
  <a href="https://github.com/k4its1t/deepseek-harness-desktop-community/actions/workflows/build.yml"><img src="https://github.com/k4its1t/deepseek-harness-desktop-community/actions/workflows/build.yml/badge.svg?branch=main" alt="构建状态"></a>
  <a href="https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest"><img src="https://img.shields.io/github/v/release/k4its1t/deepseek-harness-desktop-community" alt="最新版本"></a>
  <a href="https://github.com/k4its1t/deepseek-harness-desktop-community/releases"><img src="https://img.shields.io/github/downloads/k4its1t/deepseek-harness-desktop-community/total" alt="累计下载"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

[English](README.md)

这是一个面向 macOS 和 Windows 的非官方、简易、开源 DeepSeek Harness 桌面客户端，复用官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 与 Agent 运行时。

应用会把固定版本的 `@deepseek-ai/dsh` 作为私有子进程启动，绑定到随机回环端口，再通过沙箱化 Electron 窗口显示官方 Web UI。最终用户不需要另外安装 Node.js 或 `dsh`。

> 本项目是独立社区项目，不是 DeepSeek 官方产品，也未得到 DeepSeek 的背书或隶属关系。

## 为什么做这个

DeepSeek Harness 本身已经提供完整的 Web UI 和 Agent 运行时，但命令行安装、Node.js 环境和后台进程会让一部分桌面用户望而却步。这个项目不重新实现 Harness，而是把锁定版本的官方运行时封装进 Electron：普通用户下载安装包即可启动，已有 CLI 用户还能继续复用原来的配置、会话和工作区。

它比较适合：

- 想在 macOS 或 Windows 上用独立窗口运行 DeepSeek Harness 的用户；
- 不想单独维护 Node.js、`dsh` 命令和启动脚本的用户；
- 已经使用 CLI，希望继续复用 `~/.dsh` 数据的用户；
- 愿意测试社区构建并反馈不同硬件兼容性的开发者。

## 直接下载

| 平台 | 下载 |
| --- | --- |
| macOS Apple Silicon（M1/M2/M3/M4） | [下载 DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-mac-arm64.dmg) |
| macOS Intel | [下载 DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-mac-x64.dmg) |
| Windows x64 安装版 | [下载安装程序](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-win-x64.exe) |
| Windows x64 免安装版 | [下载便携 ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-win-x64.zip) |
| 仅下载全部 3 个配套 Skill | [下载 Skill ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-Skills.zip) |

[查看最新版发布说明与 SHA-256 校验](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest)。上面的固定链接会始终指向最新版；历史发布页也会保留并引导到这里，不会再出现页面不存在。macOS 产物已有完整 ad-hoc 完整性签名，但尚未使用 Apple Developer ID 签名和公证，请在安装前核对发布说明。

## 第一次使用

1. 按处理器和系统下载对应安装包；不确定 Mac 类型时，可在“关于本机”中查看芯片。
2. 启动应用并完成 Harness 标准引导。客户端**不附带公共 API Key**，每位用户需要配置自己的模型服务。
3. 点击“添加工作区”，通过应用内目录浏览器选择本地项目。
4. 新建会话并发送任务；现有 CLI 用户的配置和历史会自动从 `~/.dsh` 复用。

遇到启动问题时，可从菜单打开日志目录，并使用内置 `/diagnose-harness-desktop` 做只读检查。提交公开 Issue 前请删除 API Key、用户名、私人路径和项目内容。

## 功能

- 官方 DeepSeek Harness Web UI 与 Agent 运行时
- macOS 和 Windows 安装包
- 复用现有 `~/.dsh` 设置、凭据、会话和 profiles
- 使用随机 `127.0.0.1` 端口，不暴露到局域网
- Renderer 开启 Chromium 沙箱，关闭 Node integration
- 跨平台应用内目录浏览器，统一支持 macOS 与 Windows 工作区添加流程
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

[下载最新版全部配套 Skill ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest/download/DeepSeek-Harness-Desktop-Skills.zip)。只需把压缩包内的 `analyze-images-locally` 文件夹解压到 `~/.dsh/skills`，重启 Harness，然后在调用时提供本地图片路径。该 Skill 不随桌面安装包分发，因为可选 Ollama 视觉模型需要另行下载数 GB 数据；未经同意不会安装或下载依赖，也不会使用云端视觉服务兜底。

## 当前发布状态

| 平台 | 产物 | 验证状态 |
| --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP | 已在真实桌面窗口中验证首次添加工作区、现有 API 配置、会话及 Bash/写文件工具调用 |
| macOS Intel | DMG / ZIP | 由 GitHub Actions 原生构建；需要在 Intel Mac 上做最终启动验证 |
| Windows x64 | NSIS 安装程序 / 便携 ZIP | 使用与 macOS 相同的应用内目录浏览器并由 Windows GitHub Actions 原生构建；仍需实体 Windows 桌面做最终人工验证 |

仓库不包含签名证书。无证书的 macOS 构建会获得完整 ad-hoc 完整性签名，但 Gatekeeper 仍无法识别发布者；首次运行可能需要在 Finder 中右键选择“打开”，或前往“系统设置 → 隐私与安全性 → 仍要打开”。Windows 可能显示 SmartScreen 提示。详情参见 [macOS 签名与首次启动说明](docs/MACOS_SIGNING.md)。

## 能力边界与已知限制

- 这是社区桌面包装，不提供 DeepSeek 官方支持、免费 API 配额或托管服务。
- 当前没有内置自动更新；请关注 [Releases](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest) 并从固定链接下载新版。
- macOS 构建尚未获得 Apple Developer ID 公证；Windows 构建也未使用商业代码签名。
- Apple Silicon 已完成真实桌面回归；Intel Mac 和 Windows 仍欢迎实体设备测试报告。
- 本地图片分析 Skill 需要用户自行安装 Ollama 视觉模型或 Tesseract，桌面客户端不会静默下载多 GB 模型。

## 开发运行

要求 Node.js 22 或更高版本。

```bash
git clone https://github.com/k4its1t/deepseek-harness-desktop-community.git
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

## 参与与反馈

- 使用疑问、想法和使用展示：[GitHub Discussions](https://github.com/k4its1t/deepseek-harness-desktop-community/discussions)
- 可复现故障：[提交 Bug](https://github.com/k4its1t/deepseek-harness-desktop-community/issues/new?template=bug_report.yml)
- 新功能建议：[提交功能建议](https://github.com/k4its1t/deepseek-harness-desktop-community/issues/new?template=feature_request.yml)
- Intel Mac / Windows 实机结果：[提交兼容性报告](https://github.com/k4its1t/deepseek-harness-desktop-community/issues/new?template=compatibility_report.yml)
- 准备分享项目时，可直接使用 [社区分享素材包](docs/SHARING.md)
- 代码贡献要求参见 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

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
