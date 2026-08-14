# Community sharing kit / 社区分享素材包

Use these evergreen links and descriptions when sharing DeepSeek Harness Desktop. Keep the unofficial-project disclosure visible and link to `releases/latest` instead of a version-specific asset.

分享项目时请保留“非官方社区项目”说明，并始终使用 `releases/latest`，不要复制带版本号或临时签名参数的附件地址。

## Evergreen links / 固定链接

- Repository / 项目主页：<https://github.com/k4its1t/deepseek-harness-desktop-community>
- Latest release / 最新版：<https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest>
- Project icon / 项目图标：[`build/icon.png`](../build/icon.png)
- Changelog / 更新日志：[`CHANGELOG.md`](../CHANGELOG.md)

## 中文一句话介绍

DeepSeek Harness Desktop 是一个非官方开源社区桌面包装，让用户无需单独安装 Node.js 或 `dsh`，即可在 macOS 和 Windows 窗口中运行 DeepSeek Harness，并复用自己的 API 配置、会话、工作区和配套 Skill。

## 中文分享正文

> 最近在使用 DeepSeek Harness 时，发现命令行安装、Node.js 环境和后台启动流程对一部分桌面用户不够友好，于是做了一个非官方开源桌面包装：**DeepSeek Harness Desktop**。
>
> 它把锁定版本的 Harness Web UI 与 Agent 运行时封装进 Electron，提供 macOS Apple Silicon、macOS Intel 和 Windows x64 安装包。普通用户不需要另外安装 Node.js；已有 CLI 用户可以继续复用 `~/.dsh` 中的配置、会话和工作区。
>
> 当前还提供工作区目录浏览器、只读诊断、脱敏 Bug 报告和可独立安装的本地图片分析 Skill。每位用户需要配置自己的模型 API；项目不会提供或共享开发者 API Key。
>
> 项目采用 Vibe Coding 方式开发，Codex (OpenAI) 作为开发贡献者参与实现、测试、跨平台打包和文档整理。它不是 DeepSeek 官方产品；macOS 尚未 Apple 公证，Windows 也可能显示 SmartScreen 提示，欢迎不同设备的用户帮助测试。
>
> - GitHub：<https://github.com/k4its1t/deepseek-harness-desktop-community>
> - 下载：<https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest>

## English tagline

An unofficial open-source desktop shell for DeepSeek Harness, with downloadable macOS and Windows builds, reusable DSH configuration, workspace support, and companion Skills.

## English launch text

> I built DeepSeek Harness Desktop, an unofficial open-source community wrapper for the official Harness Web UI and agent runtime. It packages a pinned runtime for macOS and Windows, so users do not need to install Node.js or `dsh` separately, while existing CLI users can reuse their `~/.dsh` configuration, sessions, and workspaces.
>
> It includes a cross-platform workspace browser, privacy-aware diagnostic and bug-report Skills, and an optional local image-analysis Skill. Users configure their own model provider; no shared API key or hosted service is included.
>
> The project was developed through a Vibe Coding workflow, with Codex (OpenAI) credited as a development contributor. It is not affiliated with or endorsed by DeepSeek. Community macOS builds are not Apple-notarized, and unsigned Windows builds may trigger SmartScreen.
>
> - Repository: <https://github.com/k4its1t/deepseek-harness-desktop-community>
> - Latest release: <https://github.com/k4its1t/deepseek-harness-desktop-community/releases/latest>

## Before publishing / 发布前检查

- Use a real, current screenshot or short screen recording; blur API keys, usernames, private paths, session content, and project names.
- Describe the project as an **unofficial community wrapper**, never as an official DeepSeek client.
- Explain that every user supplies their own API configuration.
- Mention macOS notarization and Windows SmartScreen limitations instead of promising warning-free installation.
- Ask for testing feedback, bug reports, or contributions; do not ask communities to coordinate votes or stars.
- Keep Vibe Coding and AI assistance transparent, but lead with the user problem and verified functionality.
