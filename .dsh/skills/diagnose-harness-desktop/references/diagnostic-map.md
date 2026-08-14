# Diagnostic map

Load this reference only when path guidance or error classification is needed.

## Locate data safely

Prefer the application menu because Electron paths vary by operating system and packaging:

- **File → Open Log Folder** opens the directory containing `desktop.log`.
- **File → Open DSH Data Folder** opens the active DSH data directory.
- The default DSH data directory is `~/.dsh`; `DSH_HOME` can override it when the application is launched.

Do not assume a custom `DSH_HOME`, print credential contents, or recursively archive either directory.

## Error signatures

| Signature or symptom | Layer | Check next |
| --- | --- | --- |
| `Unable to start DeepSeek Harness` | Desktop shell/runtime | Read the immediately following error and confirm the bundled runtime exists. |
| `did not become ready within 30 seconds` | Harness Web runtime | Check runtime stderr, security software, loopback access, and startup resource pressure. |
| `stopped unexpectedly` | Harness Web runtime | Capture exit code/signal and the preceding runtime lines. |
| Blank or permanently loading window after a loopback URL is logged | Desktop shell/UI | Reload once, inspect renderer errors if development tools are available, and separate UI failure from runtime readiness. |
| HTTP 401/403 | Provider/API | Confirm provider and credential selection without printing the secret. |
| HTTP 404 or unknown model | Provider/API | Confirm endpoint and model identifier. |
| HTTP 429 | Provider/API | Record rate-limit/quota context and avoid repeated test calls. |
| Timeout, DNS, TLS, proxy, or connection reset | Provider/API/network | Compare browser/network policy and endpoint reachability without bypassing security controls. |
| `EACCES`, `EPERM`, or access denied during a tool call | Tool execution | Check the exact executable/path and platform permissions; do not broaden permissions globally. |
| Missing `pty.node`, `spawn-helper`, `koffi`, or `sharp` binary | Packaging/native dependency | Record OS/architecture and installation artifact name; this is usually desktop packaging evidence. |
| Session missing after restart | Profile/session | Confirm the active DSH data directory and profile before assuming deletion. |
| Add/Select Workspace does nothing and the composer stays disabled | Profile/session directory picker | Confirm the workspace registry is empty and whether the desktop Web overlay pins the browse picker; do not unpack `app.asar` to inspect it. |

## Interpretation rules

- A rendered UI plus a failed minimal API request means the desktop shell and Web runtime are probably healthy.
- A successful no-tool request plus a failed shell test isolates the problem to tool execution, workspace, or profile policy.
- A failure reproduced in the official CLI and desktop app is likely upstream or configuration-related, not necessarily desktop packaging.
- A failure unique to a packaged artifact with the same DSH home and profile is strong desktop-wrapper evidence.
