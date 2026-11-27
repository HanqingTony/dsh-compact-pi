---
name: dcp-migrate-to-dsh
description: Migrate a selected pi conversation into DeepSeek Harness so the user can resume it, including DCP summaries, retained messages, and images. Use when asked to continue a pi session in DSH or to export it for a DSH host.
---

# Migrate a pi session to DSH

1. Resolve the source to one native pi session JSONL file. Use the path the user or host provides. If given a session ID, match the ID in a pi session header under the relevant pi agent directory (`PI_CODING_AGENT_DIR` or `~/.pi/agent`). When only the project is specified, match its `cwd` and ask which session to use if there are multiple candidates. Read header metadata only for selection. Let DCP read the conversation.
2. Find the converter. Use `dcp-session` if available, or run `node <dsh-compact-pi-package>/dist/dcp-session.mjs`. When loading this bundled skill, the package root is two directories above this skill folder. In a standard pi npm install it is also under `<pi-agent-dir>/npm/node_modules/dsh-compact-pi`. Check `--help` for `pi2dsh-import` before importing.
3. Verify the target DSH version and session store. This importer targets the DSH 0.2.3-alpha.2 V4 JSONL layout. Use the target DSH process's `DSH_HOME` for attachments and the target profile's JSONL session root and compression. The defaults are `$DSH_HOME/sessions` (or `~/.dsh/sessions`) and Zstandard. Use `--plain` only when the profile uses plaintext.
4. Import with `dcp-session pi2dsh-import "<pi-jsonl>"`. Append the configured session root when it differs from the default. Append `--plain` for plaintext. If DCP reports an existing session ID, preserve the existing session and report the conflict. If the target runs on a different machine, run the import there using a securely copied source and a target workspace path valid on that machine. For a portable export, use `dcp-session pi2dsh "<pi-jsonl>" "<new-export.jsonl>"` and keep the corresponding DSH attachment store with it.
5. Report the returned session ID and project path. Resume from that project using the target UI's session picker or its explicit resume option, for example `dsh-tui --resume "<session-id>"` for the DSH TUI. The import creates a separate DSH session. The current agent session stays open. Ask before sending a first prompt in the imported session.

DCP projects the persisted pi branch into DSH and archives the original pi entries. A portable export and an immediate reverse conversion preserve the pi archive. A continued DSH session imports back as the effective DSH context. Avoid printing raw session rows or attachment data in tool output.
