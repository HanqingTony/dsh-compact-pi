---
name: dcp-migrate-to-dsh
description: Guide a user through exporting a selected Pi session or importing it into a confirmed DeepSeek Harness Desktop, Web, or TUI target. Use for Pi-to-DSH session migration and portable exports.
---

# Migrate a Pi session to DSH

Use `dcp-session migrate` or `node <package-root>/dist/dcp-session.mjs migrate`. Check `--help`. The bundled skill is two directories below the package root. When installed under a skill home, resolve its symlink or locate the DCP package from Pi's package list.

1. Ask the user to identify the source and the destination. Use `migrate sources --id <id>` or `migrate sources --cwd <absolute-project>` to show candidate headers when the source path is unclear. Let the user choose when more than one matches.
2. Confirm the target on the machine that will write it. For a portable export, ask for the export directory. For direct import, ask for Windows Desktop, Linux Desktop, Web, or TUI, the instance or profile name, DSH backend version, DSH home (images), session directory, workspace, and storage encoding. `migrate environment` supplies host information and suggestions to confirm. Run Windows Desktop imports with Windows Node.js. A WSL shell describes a separate environment.
3. Run `migrate plan` with the confirmed fields and a fresh `--plan-file`. Show the exact output and attachment paths, destination session ID, and any conflict. See [command examples](references/commands.md). For a duplicate, offer to stop or create a separate ID with `--on-conflict copy`. For a mixed Pi/DSH log, offer to stop, select another file, or explicitly recover just the Pi entries with `--recover-pi-entries`. Recovery leaves the original file intact. Encoding and unsupported-format errors need corrected input.
4. After the user approves the resulting plan, call `migrate apply --plan-file <file> --confirm <code>`. Only use the approved plan and code. If the source or destination changed, rerun the preview and confirm again. For a local interactive terminal, the user can run `dcp-session migrate` and answer the same questions directly.
5. Report the receipt. For Web, use `migrate verify-web` with an approved launch-URL file when available. For Desktop or TUI, verify that the selected app can open the imported history using its session picker. If app access is unavailable, report the write as complete with UI verification pending. Leave an imported session idle until the user asks to send a prompt.

The scripts handle reading, recovery, paths, conflict checks, attachments, and conversion. Keep session contents and Web credentials out of the conversation.
