---
name: diagnose-harness-desktop
description: Diagnose DeepSeek Harness Desktop startup, blank UI, API/provider, session, profile, shell, tool, permission, and packaging problems on macOS or Windows. Use when the desktop app will not start, a request fails, tools cannot run, sessions disappear, or the user wants a safe read-only health check without exposing credentials.
---

# Diagnose Harness Desktop

Diagnose the smallest failing layer and return evidence-backed next steps. Keep the investigation read-only unless the user explicitly asks for a fix.

## Safety rules

- Never print, copy, upload, or summarize API keys, bearer tokens, cookies, credential files, or authorization headers.
- Do not dump complete configuration, session, or log files. Read only the minimum relevant section and redact secrets before quoting it.
- Treat prompts, model responses, workspace paths, usernames, private endpoints, and session titles as potentially sensitive.
- Do not delete sessions, reset `~/.dsh`, replace profiles, reinstall the app, or change provider configuration during diagnosis.
- Explain before making an API request because it may create a session and incur cost. Use one minimal request only after the user agrees.

## Hard budget and stop rules

These rules are mandatory even when more evidence might be interesting:

- Use at most **8 diagnostic tool calls** in one diagnosis. A grouped metadata command counts as one call.
- Attempt each optional evidence target once. If a command, parser, archive read, or path lookup fails, record it under **Unverified** and do not retry it with adjusted flags, offsets, scripts, or another tool.
- Never manually parse, unpack, extract, reverse engineer, or byte-scan `app.asar`, executables, installers, or other archives during the default workflow.
- If source inspection is genuinely required, use an already available repository checkout. Otherwise state that packaged source inspection was not performed.
- As soon as the failing layer, minimal reproduction, and one supporting observation are known, stop collecting evidence and write the report.
- Do not spend additional calls confirming a healthy layer after a lower layer has already been isolated.
- If the tool-call budget would be exceeded, stop immediately and report the evidence already collected.

## Workflow

### 1. Establish the symptom

Record:

- operating system and CPU architecture;
- application version and installation source;
- whether the failure happens before the window opens, while the UI loads, during an API request, or during a tool call;
- the exact action that reproduces it and whether it worked previously.

Do not start with broad environment collection. Gather evidence for the failing stage.

### 2. Identify the failing layer

Use this order:

1. **Desktop shell** — application launch, window, navigation, permissions, or child-process lifecycle.
2. **Harness Web runtime** — loopback startup, Web UI readiness, runtime exit, or port access.
3. **Provider/API** — authentication, endpoint, model, quota, rate limit, or network errors.
4. **Profile/session** — preset selection, workspace, persistence, context, or profile plugin errors.
5. **Tool execution** — shell, PTY, executable, path, sandbox, approval, or filesystem errors.

Read [references/diagnostic-map.md](references/diagnostic-map.md) only when platform paths or error signatures are needed.

### 3. Collect minimal evidence

- Prefer **File → Open Log Folder** and **File → Open DSH Data Folder** over guessing paths.
- Inspect the desktop lifecycle log around the failure timestamp.
- Confirm that the configured DSH data directory exists; inspect names and metadata before file contents.
- Confirm whether the UI loaded a random `http://127.0.0.1:<port>` URL. Do not expose the service beyond loopback.
- For API failures, record the provider/model name and sanitized status or error class. Never reveal credentials.
- For tool failures, compare a no-tool request with one harmless read-only command such as `pwd`/`cd` plus directory listing, only when the user permits the test.
- Distinguish reproducible evidence from inference.

### 4. Use a minimal test ladder

Stop as soon as the failing layer is isolated:

1. Launch the application and confirm the Harness UI renders.
2. Open an existing session without sending a request.
3. With permission, send one minimal no-tool request: `Reply with DESKTOP_API_OK only.`
4. With permission, run one read-only shell test in a disposable or user-approved directory.

Do not run destructive commands, modify the user's project, or repeat paid API calls merely to increase confidence.

### 5. Report the diagnosis

Return:

- **Result:** healthy, degraded, or failed;
- **Failing layer:** one of the five layers above;
- **Evidence:** concise sanitized observations;
- **Likely cause:** label inference explicitly;
- **Next action:** the smallest reversible fix or next check;
- **Unverified:** anything that requires another OS, credentials, paid requests, or user interaction.

Do not delay the report to inspect implementation details after the failing layer is isolated.

If the issue should be reported upstream, recommend loading `prepare-harness-bug-report` after the evidence is collected.
