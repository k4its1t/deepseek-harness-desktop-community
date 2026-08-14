# Security policy

## Supported versions

Only the latest release is supported with security fixes.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature in the repository's **Security** tab. Include the affected version, operating system, reproduction steps, and expected impact.

## Security design

- The bundled Harness server binds to `127.0.0.1` on an operating-system-assigned port.
- The renderer has no Node.js integration, runs with context isolation and Chromium sandboxing, and receives no privileged preload API.
- The wrapper does not read or forward API keys. DeepSeek Harness owns credential storage under `DSH_HOME`.
- New windows and off-origin navigation are denied in the app and opened in the system browser only for `http`, `https`, and `mailto` URLs.

This is a local developer tool with agent capabilities. Review requested tool permissions before approving filesystem or command execution.
