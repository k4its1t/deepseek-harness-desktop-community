# DeepSeek Harness Desktop Community

[English](README.md)

这是一个面向 macOS 和 Windows 的非官方、简易、开源 DeepSeek Harness 桌面客户端，复用官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 与 Agent 运行时。

应用会把固定版本的 `@deepseek-ai/dsh` 作为私有子进程启动，绑定到随机回环端口，再通过沙箱化 Electron 窗口显示官方 Web UI。最终用户不需要另外安装 Node.js 或 `dsh`。

> 本项目是独立社区项目，不是 DeepSeek 官方产品，也未得到 DeepSeek 的背书或隶属关系。

## 功能

- 官方 DeepSeek Harness Web UI 与 Agent 运行时
- macOS 和 Windows 安装包
- 复用现有 `~/.dsh` 设置、凭据、会话和 profiles
- 使用随机 `127.0.0.1` 端口，不暴露到局域网
- Renderer 开启 Chromium 沙箱，关闭 Node integration
- 复用原生目录选择器及平台相关 Harness 工具
- 桌面应用退出时自动清理运行时子进程

## 当前发布状态

| 平台 | 产物 | 验证状态 |
| --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP | 已在真实桌面窗口中验证启动、现有 API 配置、会话及 Bash 工具调用 |
| macOS Intel | DMG / ZIP | 由 GitHub Actions 原生构建；需要在 Intel Mac 上做最终启动验证 |
| Windows x64 | NSIS 安装程序 / 便携 ZIP | 已在 macOS 交叉构建并检查 Windows 原生依赖；需要在 Windows 或 GitHub Actions 中做最终启动验证 |

仓库不包含签名证书，因此本地构建和 CI 产物默认未签名。macOS 第一次运行时可能需要在 Finder 中右键选择“打开”，Windows 可能显示 SmartScreen 提示。

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

未签名产物会写入 `release/`。GitHub Actions 会生成 macOS x64、macOS arm64 和 Windows x64 产物。正式公开发布前应配置代码签名，并对 macOS 应用进行公证；仓库不会包含签名凭据。

Windows 便携 ZIP 解压后可直接运行其中的 `DeepSeek Harness Desktop Community.exe`；NSIS `.exe` 安装程序应在 Windows 或仓库自带的 GitHub Actions 中生成。

## 日志与数据

通过 **File → Open Log Folder** 或 **File → Open DSH Data Folder** 打开目录。桌面壳只记录生命周期日志；常规数据仍由 DeepSeek Harness 保存在 `~/.dsh`。

## 安全设计

Web UI 只监听随机回环端口。Electron Renderer 使用 `contextIsolation`、Chromium sandbox，未启用 Node integration，也没有高权限 preload bridge。更多信息参见 [SECURITY.md](SECURITY.md)。

## 版本管理

`runtime/package.json` 中的 Harness 依赖采用精确版本锁定。升级前应检查上游变化并重新运行测试。

运行时在 `runtime/` 下使用独立 lockfile。这是有意设计：profile 插件采用动态加载，因此构建时会把完整生产依赖树作为未封装应用资源复制，避免被 Electron 的静态依赖打包器错误裁剪。

## 许可证

本桌面包装项目采用 MIT License。DeepSeek Harness 及其他依赖保留各自许可证，参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
