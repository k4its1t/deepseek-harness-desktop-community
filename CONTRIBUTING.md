# Contributing

Contributions are welcome: code, documentation, reproducible bug reports, platform compatibility results, and companion Skill improvements all help.

## Before starting

- Search existing [issues](https://github.com/k4its1t/deepseek-harness-desktop-community/issues) and [discussions](https://github.com/k4its1t/deepseek-harness-desktop-community/discussions).
- Use a Discussion for a broad product idea or architecture change before investing in a large patch.
- Report suspected vulnerabilities privately through the repository's **Security** tab; never post credentials or sensitive logs in a public issue.
- Confirm whether the behavior also reproduces in the official DeepSeek Harness CLI or Web UI. Upstream-only problems belong in the [upstream repository](https://github.com/deepseek-ai/deepseek-harness).

## Local workflow

Requirements: Node.js 22 or newer.

```bash
npm ci
npm test
npm start
```

Keep changes focused and describe user-visible behavior in the pull request. If a change affects public behavior or setup, update both `README.md` and `README.zh.md`.

## Project guardrails

1. Keep the renderer unprivileged: do not enable Node integration or expose a general-purpose IPC bridge.
2. Keep the Harness server bound to a random `127.0.0.1` port.
3. Do not read, print, upload, or commit API keys, session content, user paths, or private logs.
4. Preserve cleanup of the Harness child process when the desktop app exits.
5. Keep runtime dependencies pinned and review upstream changes before upgrading them.
6. Test lifecycle, packaging, and workspace changes on both macOS and Windows when possible. Clearly mark any platform that remains unverified.
7. Do not commit generated installers, unpacked applications, signing credentials, or local DSH data.

## AI-assisted contributions

AI-assisted patches are welcome when the contributor reviews the result, can explain the change, and supplies meaningful validation. Disclose material AI assistance in the pull request, but do not include private prompts, credentials, or unrelated generated content.
