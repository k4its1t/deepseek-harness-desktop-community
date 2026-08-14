# DeepSeek Harness Desktop Community

[中文](README.zh.md)

An unofficial, minimal, open-source desktop shell for the official [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI on macOS and Windows.

The app starts the pinned `@deepseek-ai/dsh` runtime as a private child process, binds it to a random loopback port, and displays the official Web UI in a sandboxed Electron window. End users do not need to install Node.js or `dsh` separately.

> This community project is not an official DeepSeek product and is not affiliated with or endorsed by DeepSeek.

## Direct downloads

| Platform | Download |
| --- | --- |
| macOS Apple Silicon (M1/M2/M3/M4) | [Download DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.2.0/DeepSeek-Harness-Desktop-Community-0.2.0-macOS-arm64.dmg) |
| macOS Intel | [Download DMG](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.2.0/DeepSeek-Harness-Desktop-Community-0.2.0-macOS-x64.dmg) |
| Windows x64 installer | [Download setup](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.2.0/DeepSeek-Harness-Desktop-Community-0.2.0-Windows-x64-Setup.exe) |
| Windows x64 portable | [Download portable ZIP](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/download/v0.2.0/DeepSeek-Harness-Desktop-Community-0.2.0-Windows-x64-portable.zip) |

[View the full v0.2.0 release notes and SHA-256 checksums](https://github.com/k4its1t/deepseek-harness-desktop-community/releases/tag/v0.2.0). The artifacts are unsigned; review the release notes before installing.

## Features

- Official DeepSeek Harness Web UI and agent runtime
- macOS and Windows installers
- Existing `~/.dsh` settings, credentials, sessions, and profiles
- Random `127.0.0.1` port; no LAN exposure
- Sandboxed renderer with Node integration disabled
- Native directory picker and platform-specific Harness tools
- Automatic child-process shutdown when the desktop app quits
- Bundled diagnosis and privacy-safe bug-report skills

## Companion skills

The desktop app bundles two optional skills from `.dsh/skills` and makes them available automatically:

- `/diagnose-harness-desktop` safely performs read-only diagnosis of desktop startup, API, session, profile, tool, permission, and packaging problems.
- `/prepare-harness-bug-report` turns diagnostic evidence into a sanitized, reproducible GitHub issue draft.

DeepSeek Harness also discovers the source copies automatically when this repository is the current workspace. To use them with other Harness installations, copy them to the default user skill directory:

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

The skills do not read or expose API keys by default and will not send test requests, change configuration, or submit GitHub issues without explicit user approval. `npm test` validates their discovery and metadata with the pinned DeepSeek Harness parser.

## Release status

| Platform | Artifact | Verification status |
| --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP | Launch, existing API configuration, sessions, and Bash tool invocation verified in the real desktop window |
| macOS Intel | DMG / ZIP | Built natively by GitHub Actions; final launch verification requires an Intel Mac |
| Windows x64 | NSIS installer / portable ZIP | Built natively by Windows GitHub Actions; final interactive verification still requires a physical Windows desktop |

The repository intentionally contains no signing certificates, so local and CI artifacts are unsigned by default. On first launch, macOS may require **Open** from Finder's context menu, and Windows may show a SmartScreen warning.

## Install for development

Requirements: Node.js 22 or newer.

```bash
git clone <your-repository-url>
cd deepseek-harness-desktop-community
npm ci
npm start
```

The first launch uses the standard DeepSeek Harness onboarding flow. Existing CLI users automatically reuse `~/.dsh`. You can override the location by setting `DSH_HOME` before launching the app.

## Test

```bash
npm test
npm run smoke
```

The smoke test launches Electron, starts the bundled Harness runtime, waits for the Web UI to render, prints `DESKTOP_SMOKE_OK`, and exits.

## Build installers

```bash
# Run on macOS
npm run dist:mac

# Run on Windows
npm run dist:win
```

Unsigned artifacts are written to `release/`. The GitHub Actions workflow builds macOS x64, macOS arm64, and Windows x64 artifacts. Public releases should be signed and, on macOS, notarized. Signing credentials are deliberately not included in this repository.

The Windows portable ZIP can be extracted and run via `DeepSeek Harness Desktop Community.exe`. Build the NSIS `.exe` installer on Windows or with the included GitHub Actions workflow.

## Logs and data

Use **File → Open Log Folder** or **File → Open DSH Data Folder**. The wrapper writes lifecycle logs only; DeepSeek Harness owns its normal data under `~/.dsh`.

## Vibe Coding and contributors

This project was developed using a **Vibe Coding** workflow: the project maintainer defined the goals, supplied the runtime environment, and approved the release direction, while `Codex (OpenAI)` assisted with implementation, testing, cross-platform packaging, debugging, and documentation.

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the contributor statement. AI-assisted development does not change this project's status as an unofficial community wrapper; publishers remain responsible for reviewing the code, validating artifacts, and assessing usage risks.

## Security

The Web UI is reachable only on a random loopback port. Electron's renderer uses `contextIsolation`, Chromium sandboxing, and no Node.js integration or preload bridge. See [SECURITY.md](SECURITY.md).

## Versioning

The Harness dependency is intentionally pinned in `runtime/package.json`. Review and test upstream changes before updating it.

The runtime has its own lockfile under `runtime/`. This is intentional: profile plugins are loaded dynamically, so the complete production tree is copied as an unpacked application resource instead of being pruned by Electron's static dependency packager.

## License

This wrapper is released under the MIT License. DeepSeek Harness and other dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
