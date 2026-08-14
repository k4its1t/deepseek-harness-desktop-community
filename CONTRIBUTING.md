# Contributing

Contributions are welcome.

1. Use Node.js 22 or newer.
2. Run `npm ci`.
3. Run `npm test` before submitting a pull request.
4. Keep the renderer unprivileged: do not enable Node integration or expose a general-purpose IPC bridge.
5. Test runtime lifecycle changes on both macOS and Windows when possible.

Please keep changes focused and describe user-visible behavior in the pull request.
