---
name: dcp-migrate-to-dsh
description: Guide a user through exporting a selected Pi session or importing it into a confirmed DeepSeek Harness Desktop, Web, or TUI target. Use for Pi-to-DSH session migration and portable exports.
---

# Migrate a Pi session to DSH

Use `dcp-session migrate` or `node <package-root>/dist/dcp-session.mjs migrate`. Check `--help`. The bundled skill is two directories below the package root. When installed under a skill home, resolve its symlink or locate the DCP package from Pi's package list.

## Ask one question and wait for the answer

Ask in the user's language. Use the host's user-input tool when available, or ask in chat and end the turn. Offer short choices when known. Never present a configuration table, a questionnaire covering multiple decisions, or raw plan JSON to the user. Skip questions whose answers the user already provided explicitly. Detection and defaults supply suggestions. A missing or ambiguous answer stays unresolved until the user answers.

1. **Source.** Ask which Pi session to use if it is unclear. Use `migrate sources --id <id>` or `migrate sources --cwd <absolute-project>` to find candidates. Even a single match is a suggestion when the user has only named the project.
2. **Destination.** Ask whether to export a portable folder or import directly. For portable export, ask where to put the folder. For direct import, ask which machine and DSH instance to use. If that still leaves the profile or client ambiguous, ask which one. Confirm the destination workspace, then ask separately about each unresolved storage detail. Use [target details](references/commands.md#target-details) to identify what needs verification.
3. **Conflict.** Run `migrate plan` with the confirmed selection and a fresh `--plan-file`. Ask about one conflict at a time. For a duplicate, ask whether to stop or use a separate ID (`--on-conflict copy`). For a mixed log, ask whether to stop, choose another file, or recover only the Pi entries (`--recover-pi-entries`). Recovery leaves the source intact. Ask for corrected input on an encoding or format mismatch. Rerun the plan only after the user decides.
4. **Write approval.** Show the source session, target and exact output path in a short sentence or a few lines. Include the separate attachment location, new ID or recovery choice only when relevant. Ask a single question, such as “现在写入这个位置吗？” Wait for explicit approval of this plan. Then run `migrate apply --plan-file <file> --confirm <code>` using the saved plan and its code. If the plan becomes stale, preview it again and ask for fresh approval.

Report the receipt. For Web, use `migrate verify-web` with an approved launch-URL file when available. For Desktop or TUI, verify the imported history using the session picker. If app access is unavailable, report the write with UI verification pending. Leave the imported session idle until the user asks to send a prompt.

The scripts handle reading, recovery, paths, conflict checks, attachments, and conversion. Keep session contents and Web credentials out of the conversation.
