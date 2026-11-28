# DCP usage and troubleshooting

Install from the [Pi package catalog](https://pi.dev/packages/dsh-compact-pi) with:

```bash
pi install npm:dsh-compact-pi@latest
```

Use the explicit tag while the npm release has a prerelease version. The GitHub tag is also available:

```bash
pi install git:github.com/HanqingTony/dsh-compact-pi@v0.2.3-b5
```

Restart pi or run `/reload` while idle. `/dcp-status` should show DCP `0.2.3b5` and DSH `0.2.3-alpha.2`. DCP is tested with pi 1.5.2 and 1.6.1 and needs Node.js `^24.22.3 || >=26.13.1`. Check `pi list` for duplicate installations if commands or warnings appear twice. See the [update instructions](../README.md#updating-an-existing-installation) for pinned tags and branch installs.

## Compaction and model selection

- `/dcp-compact` runs manual DSH compaction when pi is idle. The ordinary `/compact` command also reaches DCP when pi admits the operation.
- `/dcp-summary-model` opens a picker for the project default summary model. The chosen model writes the summary and the active session model continues the conversation.
- `/dcp-summary-model reset` restores automatic summary model selection for the project default. DSH prefers the last model that answered, then the most recent request route. An exact `modelPolicies` override still takes precedence.
- Expand a compaction card with `Ctrl+O` to check the engine, model and token estimates. See the [policy settings](../README.md#configuration) for pressure, retention and output budgets.

If a historical summary model is unavailable in pi, use the picker to select an available model. If a model has a small context window, check `/dcp-status` and set a headroom budget that fits. An unsupported attachment warning leaves the original context available. Use the exact warning and the version shown by `/dcp-status` when reporting a problem.

## Move a session between pi and DSH

Run `dcp-session migrate` in a terminal, or ask the `dcp-migrate-to-dsh` skill to guide you. The skill asks one key question at a time and waits for your answer. Once the destination and any conflicts are settled, it shows the exact output path and asks whether to write. Agents use `migrate plan` and `migrate apply` to keep the preview and write separate. See the [command examples](../skills/dcp-migrate-to-dsh/references/commands.md).

- **Portable export** writes a new folder under the export directory you choose. Move that whole folder to keep the JSONL and images together.
- **Direct import** uses the target backend's version, profile, data home, session directory, workspace, and encoding. Run on the target machine. On Windows, use Windows Node.js and Windows paths. On Linux, use the data paths of the backend your desktop client actually connects to.
- **Conflicts** stop the default plan. You can explicitly choose a new session ID while preserving the existing one, or recover the Pi entries from a recognized mixed log while preserving the original file. Encoding mismatches require a corrected target configuration.

The import receipt confirms a write. Open the imported history in the chosen Desktop or TUI, or run `migrate verify-web` to check both the list and history of the approved Web instance.

The CLI can also run low-level conversions for scripts. In a checkout use `node dist/dcp-session.mjs --help`. Exit the active source session or work from a copy.

```bash
dcp-session pi2dsh-import session.pi.jsonl
dcp-session pi2dsh session.pi.jsonl exported.dsh.jsonl
dcp-session dsh2pi exported.dsh.jsonl imported.pi.jsonl
pi --session imported.pi.jsonl
```

`pi2dsh-import` writes a new session into the DSH 0.2.3-alpha.2 V4 store and prints its ID and working directory. Open it in DSH's session picker or run `dsh-tui --resume <session-id>` from that directory. The default store is `$DSH_HOME/sessions` with Zstandard encoding. Pass the configured session root as the second argument for a custom profile. Add `--plain` for profiles using plaintext JSONL. An existing session with the same ID and workspace is left intact.

In Pi, request a migration or run `/skill:dcp-migrate-to-dsh`. To invoke it from DSH, copy the [skill directory](../skills/dcp-migrate-to-dsh) into `$DSH_HOME/skills` (default `~/.dsh/skills`). Both hosts need access to the converter and source file.

The export archives pi entries, including the branch tree, and gives DSH the active compacted context. Reimporting an unchanged export restores the archived pi entries. Reimporting a session after continuing in DSH uses the live DSH context as a linear pi session. Keep the original file for its full history and host-specific metadata.

The CLI report counts archived source messages, which may exceed the number shown in DSH. Incomplete tool exchanges are kept in the Pi archive and omitted from the DSH active context.

Image references use `DSH_HOME`, which defaults to `~/.dsh`. Keep that attachment store with the logs when moving them across machines. If image import reports a missing object, point `DSH_HOME` at the corresponding store. For compressed DSH input, install the `zstd` command.

If old messages seem to disappear after a pi upgrade, confirm that the session path and branch are correct. A standard pi session shows the latest active summary and retained messages while the raw JSONL still holds the earlier entries. Files written by the v0.1 core patch need [legacy migration](native-session-codec.md). A file containing both DSH events and appended pi entries requires separate recovery of each part.
