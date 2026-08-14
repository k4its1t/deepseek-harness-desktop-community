# macOS 签名与首次启动

DeepSeek Harness Desktop 的社区构建不会在仓库中保存 Apple 证书。v0.3.1 起，无证书构建也会获得完整的 **ad-hoc 完整性签名**：应用主程序、Electron Helper、Framework、原生模块、Info.plist 与资源封装都会被签名和严格验证。

ad-hoc 签名只能证明下载后的应用内容是否仍与打包时一致，不能向 Gatekeeper 证明发布者身份。要让联网下载的应用获得 Apple 的标准无提示启动体验，仍需 Apple Developer Program 提供的 **Developer ID Application** 证书与 Apple 公证。

## 普通用户首次打开

1. 从 GitHub Releases 下载与处理器匹配的 DMG，并对照 `SHA256SUMS.txt` 校验。
2. 打开 DMG，把 **DeepSeek Harness Desktop** 拖入“应用程序”。
3. 在 Finder 的“应用程序”中右键应用，选择“打开”。
4. 如果系统仍阻止启动，前往“系统设置 → 隐私与安全性”，确认应用名称后选择“仍要打开”。

如果确认 SHA-256 与发布页一致，但系统界面仍无法授权，可以在终端移除这一个应用的下载隔离属性：

```bash
xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness Desktop.app"
```

不要对整个“应用程序”目录或不可信文件批量运行该命令。

## 本地验证

```bash
codesign --verify --deep --strict --verbose=2 \
  "/Applications/DeepSeek Harness Desktop.app"
```

命令没有报错表示 Bundle 签名结构完整。`codesign -dvvv` 在社区构建中会显示 `Signature=adhoc` 和 `TeamIdentifier=not set`，这是没有 Developer ID 时的预期状态。

## 维护者配置 Developer ID 与公证

在 GitHub 仓库的 Actions secrets 中设置以下五项：

- `MACOS_CSC_LINK`：导出的 Developer ID Application `.p12` 文件的 Base64 内容或 electron-builder 支持的私密下载地址。
- `MACOS_CSC_KEY_PASSWORD`：`.p12` 密码。
- `MACOS_APPLE_ID`：提交公证使用的 Apple ID。
- `MACOS_APP_SPECIFIC_PASSWORD`：该 Apple ID 的 app-specific password。
- `MACOS_TEAM_ID`：Apple Developer Team ID。

构建脚本检测到 `CSC_LINK` 后会停用 ad-hoc 后备方案，让 electron-builder 使用 Developer ID 证书；检测到完整 Apple 凭据后会继续调用 `notarytool` 公证。未提供任何凭据时仍可构建可验证的社区版。

请参阅 Apple 的 [Developer ID 说明](https://developer.apple.com/support/developer-id/) 与 [macOS 软件公证指南](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)。证书、密码和 Apple 凭据不得提交到 Git、Release 附件或构建日志。
