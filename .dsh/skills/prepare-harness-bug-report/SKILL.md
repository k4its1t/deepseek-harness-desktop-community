---
name: prepare-harness-bug-report
description: Create a sanitized, reproducible GitHub issue for DeepSeek Harness Desktop problems. Use when the user wants to report a crash, startup failure, API error, broken session, profile problem, tool failure, or platform-specific packaging bug and needs environment details, minimal reproduction steps, logs, and privacy-safe evidence organized for maintainers.
---

# Prepare Harness Bug Report

Turn verified evidence into a concise issue that maintainers can reproduce. Do not submit the issue unless the user explicitly asks.

## Workflow

### 1. Confirm the reporting target

Default desktop-wrapper issues to `k4its1t/deepseek-harness-desktop-community`. Separate upstream Harness behavior from desktop packaging behavior:

- report window, bundled-runtime, installer, packaged native dependency, shutdown, or desktop-only path problems to the desktop repository;
- identify provider, model, profile, or upstream Harness behavior separately, without claiming an upstream defect before isolation.

If the failure has not been isolated, load `diagnose-harness-desktop` first when it is available.

### 2. Gather only useful facts

Collect:

- application version and installation method;
- OS version and CPU architecture;
- affected profile, provider, and model names without credentials;
- exact minimal reproduction steps;
- expected and actual behavior;
- first relevant error and a short sanitized log excerpt;
- whether a no-tool request and a read-only tool request succeed;
- regression status, frequency, and workaround when known.

Use `assets/bug-report-template.md` as the output structure. Remove unused optional rows rather than filling them with speculation.

### 3. Apply the privacy gate

Before presenting the report:

- replace API keys, bearer tokens, cookies, and secret-like values with `<REDACTED>`;
- replace personal home-directory segments with `~` or `<USER>`;
- omit prompts, model responses, session content, and project filenames unless essential and approved by the user;
- redact private hosts, organization names, email addresses, and internal repository URLs;
- include only a narrow log excerpt around the first relevant failure;
- never attach the complete `~/.dsh` directory, credential store, session database, or environment dump.

State that redaction was performed. If safe redaction is uncertain, leave the field out and tell the user what evidence was withheld.

### 4. Preserve diagnostic integrity

- Separate observed facts from suspected causes.
- Use exact error text only after sanitization.
- Do not invent version numbers, reproduction success rates, or expected behavior.
- Mark unavailable information as `Unknown` only when the field is necessary.
- Keep one issue focused on one failure mode.

### 5. Deliver the draft

Return:

1. a suggested issue title using `[macOS]`, `[Windows]`, `[Runtime]`, `[API]`, or `[Tool]` when appropriate;
2. the completed Markdown issue body;
3. a short list of evidence intentionally omitted for privacy;
4. remaining manual checks, especially when the other operating system was not tested.

Do not upload files, create a GitHub issue, or contact maintainers without explicit user authorization.
