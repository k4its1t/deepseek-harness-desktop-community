# Security policy

## Supported versions

None. Maintenance ended on September 25, 2026, including security updates for v0.4.0 and all earlier releases. Use the [official DeepSeek Harness desktop](https://github.com/deepseek-ai/deepseek-harness/tree/master/apps/desktop) instead. Historical binaries are unsupported.

## Reporting a vulnerability

Do not post credentials or sensitive logs publicly. This community project no longer promises vulnerability triage or fixes. If a vulnerability also affects the official application, follow the upstream security policy; do not send community-wrapper-only issues to upstream as official product bugs.

## Security design

- The bundled Harness server binds to `127.0.0.1` on an operating-system-assigned port.
- The renderer has no Node.js integration and runs with context isolation and Chromium sandboxing. Only the local loading page receives two fixed recovery actions; handlers validate both the owning main frame and exact local page URL. The remote Web UI receives no bridge.
- DeepSeek Harness owns credential storage under `DSH_HOME`. The wrapper preserves the launch environment for supported API-key and proxy configuration; it does not parse or store API keys itself.
- Child-process output is excluded from desktop logs by default. Diagnostic runtime logging is opt-in and can contain private data; review it before sharing and disable it after troubleshooting.
- Startup authentication URLs are omitted even in diagnostic mode; other logged URLs lose credentials, queries and fragments. This is not a general-purpose conversation-data scrubber.
- Upgrade backups include credentials. They live under private application data with POSIX owner-only access or a Windows user-only inherited ACL. Do not attach backups to public reports.
- New windows and off-origin navigation are denied in the app and opened in the system browser only for `http`, `https`, and `mailto` URLs.

This is a local developer tool with agent capabilities. Review requested tool permissions before approving filesystem or command execution.
