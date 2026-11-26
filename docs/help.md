# DCP usage and troubleshooting

Install from the [Pi package catalog](https://pi.dev/packages/dsh-compact-pi) with:

```bash
pi install npm:dsh-compact-pi@latest
```

Use the explicit tag while the npm release has a prerelease version. The GitHub tag is also available:

```bash
pi install git:github.com/HanqingTony/dsh-compact-pi@v0.2.3-b2
```

Restart pi or run `/reload` while idle. `/dcp-status` should show DCP `0.2.3b2` and DSH `0.2.3-alpha.2`. DCP is tested with pi 1.5.2 and 1.6.0 and needs Node.js `^24.22.3 || >=26.13.1`. Check `pi list` for duplicate installations if commands or warnings appear twice. See the [update instructions](../README.md#updating-an-existing-installation) for pinned tags and branch installs.

## Compaction and model selection

- `/dcp-compact` runs manual DSH compaction when pi is idle. The ordinary `/compact` command also reaches DCP when pi admits the operation.
- `/dcp-summary-model` opens a picker for the project default summary model. The chosen model writes the summary and the active session model continues the conversation.
- `/dcp-summary-model reset` restores automatic summary model selection for the project default. DSH prefers the last model that answered, then the most recent request route. An exact `modelPolicies` override still takes precedence.
- Expand a compaction card with `Ctrl+O` to check the engine, model and token estimates. See the [policy settings](../README.md#configuration) for pressure, retention and output budgets.

If a historical summary model is unavailable in pi, use the picker to select an available model. If a model has a small context window, check `/dcp-status` and set a headroom budget that fits. An unsupported attachment warning leaves the original context available. Use the exact warning and the version shown by `/dcp-status` when reporting a problem.

## Move a session between pi and DSH

Use the CLI from the unpacked package or a development checkout with `node dist/dcp-session.mjs --help`. npm installs also expose the `dcp-session` command. Exit the active session or work from a copy and choose a separate output path.

```bash
dcp-session pi2dsh session.pi.jsonl exported.dsh.jsonl
dcp-session dsh2pi exported.dsh.jsonl imported.pi.jsonl
pi --session imported.pi.jsonl
```

The export archives pi entries, including the branch tree, and gives DSH the active compacted context. Reimporting an unchanged export restores the archived pi entries. Reimporting a session after continuing in DSH uses the live DSH context as a linear pi session. Keep the original file for its full history and host-specific metadata.

Image references use `DSH_HOME`, which defaults to `~/.dsh`. Keep that attachment store with the logs when moving them across machines. If image import reports a missing object, point `DSH_HOME` at the corresponding store. For compressed DSH input, install the `zstd` command.

If old messages seem to disappear after a pi upgrade, confirm that the session path and branch are correct. A standard pi session shows the latest active summary and retained messages while the raw JSONL still holds the earlier entries. Files written by the v0.1 core patch need [legacy migration](native-session-codec.md). A file containing both DSH events and appended pi entries requires separate recovery of each part.
