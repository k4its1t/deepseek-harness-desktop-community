# Changelog

All notable changes to this project are documented in this file.

## 0.2.0 - 2026-08-14

- Added bundled companion skills for safe desktop diagnosis and sanitized bug-report preparation.
- Added automated skill discovery, metadata, and resource validation using the pinned DeepSeek Harness parser.

## 0.1.0 - 2026-08-14

- Added a minimal Electron shell for the official DeepSeek Harness Web UI.
- Bundled the pinned `@deepseek-ai/dsh` runtime and platform-native dependencies.
- Added random loopback-port startup, sandboxed rendering, navigation restrictions, and child-process cleanup.
- Added macOS arm64/x64 and Windows x64 packaging scripts.
- Added GitHub Actions builds, automated tests, security policy, contribution guide, third-party notices, and bilingual documentation.
- Fixed CI packaging by using a native Intel macOS runner and disabling electron-builder's implicit CI publishing mode.
- Documented the project's Vibe Coding workflow and Codex contribution.
