# Upgrading and restoring / 升级与恢复

## Before starting v0.4.0 / 启动前

Harness is pinned to **0.1.5-rc.1**, including its DSH subpackages. Close any CLI or other desktop instance using the same `DSH_HOME` before continuing. The default is still `~/.dsh`; existing API settings are reused, while new users configure their own credentials.

本版内置 Harness **0.1.5-rc.1**。请先关闭使用同一 `DSH_HOME` 的 CLI 和其他客户端。默认目录仍是 `~/.dsh`，已有 API 配置会复用，新用户需要自行配置。

Existing data requires a successful backup before the new runtime starts. The dialog offers Cancel and Back up. On failure, the recovery screen offers Retry and Open logs; it does not start the runtime. New empty data directories need no backup.

已有数据须先备份成功才会启动新版。取消或备份失败后，可在恢复页重试、打开日志。全新空数据目录无需备份。

## Backup contents / 备份内容

Use **Help → Upgrade backups** to find the private, timestamped backups in the Electron application-data directory. Each completed backup has `manifest.json` and `data/`. The manifest identifies the original directory and target runtime. A completion receipt prevents repeated backups for the same directory and runtime.

通过 **Help → Upgrade backups** 打开备份目录。完成的备份包含 `manifest.json` 和 `data/`；仅有目录、没有完成清单的备份可能不完整。备份记录位于 Electron 应用数据目录，不放在原 Harness 数据树内。

Configurations, credentials, session histories, attachments, custom plugins and skills are copied. `node_modules` and `.cache` directories are excluded because they are rebuildable. Symbolic links are preserved, not followed: the contents of externally linked folders are **not** backed up. Back up those folders separately. Keep backups private; they include credentials. Interrupted or failed copies are retained for inspection and do not authorize the upgrade.

备份包含配置、凭据、会话、附件、自定义插件和 Skill，排除可重建的 `node_modules`、`.cache`。符号链接只保留链接，**不复制外部目标内容**；外部目录需另行备份。备份含有密钥，请勿上传到 Issue 或公开仓库。失败或中断的副本会保留供检查，不视为备份成功。

## Restore an older client / 恢复旧版

1. Quit all desktop and CLI Harness instances. Do not copy over live data.
2. Locate a completed backup made before the upgrade and confirm its manifest points to the intended original data directory.
3. Rename the current data directory to preserve it. Restore the backup's entire `data/` directory to the original location; do not merge individual session files into upgraded data.
4. Restore any separately backed-up external link targets. The older runtime rebuilds its dependency links; custom profile dependencies may need reinstalling using their saved manifests.
5. Start the older client against this restored directory. New conversations created after the backup are only in the renamed newer directory, not the restored copy.

恢复时先关闭所有实例，将现有数据目录改名保留，再把完整的 `data/` 恢复到原位置。不要混合新旧会话文件，也不要让旧客户端直接读取已经升级的数据。备份之后的新会话仍在改名保存的目录中。自定义插件依赖可能需要按保留的清单重新安装。

Official Harness owns format migration. Retaining older generations is not a downgrade guarantee. Restoring a complete pre-upgrade backup is the supported recovery procedure.

官方 Harness 负责格式迁移；保留旧格式文件不代表可直接降级。本项目支持的恢复方式是还原完整的升级前备份。

## Validation / 验证

`npm test` checks backup, lifecycle and skill behavior. `npm run prepare:legacy-test` installs the exact old runtime lockfile for isolated migration tests; this legacy fixture is never bundled. `npm run test:e2e` uses a local mock model and real shell tools. `npm run test:migration` creates an old Web session, backs it up, continues it in the new Web UI, restarts the app, and verifies the restored backup through the old persistence implementation. `npm run test:package` runs acceptance against the macOS application or a silently installed Windows NSIS package.

CI acceptance is not a substitute for manual Windows focus, SmartScreen and installer UI testing. macOS ad-hoc signature verification is not Developer ID signing or notarization.
