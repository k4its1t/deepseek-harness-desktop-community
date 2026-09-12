# Third-party notices

This project depends on [`@deepseek-ai/dsh`](https://github.com/deepseek-ai/deepseek-harness), the official DeepSeek Harness command-line and Web application, which is distributed under the MIT License.

This repository is an independent community project. It is not an official DeepSeek product and is not endorsed by or affiliated with DeepSeek.

Binary distributions produced by this project contain third-party npm packages. Their package metadata and license files remain included in the application archive. Run `npm ls --all` to inspect the resolved dependency tree.

The v0.4.0 runtime pins Harness and its DSH subpackages to 0.1.5-rc.1. See [the generated bundled dependency inventory](THIRD_PARTY_LICENSES.md) for versions and license declarations. Original licenses remain alongside each packaged dependency. Old runtime fixtures and Playwright are test-only and are not distributed in the application.

The application icon files under `build/icon.*` are maintainer-supplied artwork used for the desktop application's visual identity. They are not presented as the official DeepSeek logo. Downstream distributors should independently confirm that they have permission to redistribute the artwork; the repository's MIT license does not automatically grant rights to third-party artwork.
