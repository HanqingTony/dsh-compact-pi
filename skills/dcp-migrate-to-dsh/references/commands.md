# Migration commands

Run from the target OS, using an absolute path to the source copy accessible there. A Windows destination uses Windows paths and Windows Node.js. Quote paths with spaces.

## Direct import

```text
dcp-session migrate plan --source "<pi.jsonl>" --target windows-desktop --profile desktop --dsh-version 0.2.2-rc.5 --dsh-home "<DSH home>" --session-root "<session directory>" --workspace "<existing workspace>" --encoding zstd --plan-file "<new plan.json>"
dcp-session migrate apply --plan-file "<plan.json>" --confirm "<code>"
```

Use `linux-desktop` for a Linux desktop client on the same machine as its compatible DSH backend. Use the backend's version and storage settings. For Web or TUI use that instance or profile's settings. Distribution version and backend version can differ.

For Desktop and Web, choose a workspace already shown in the target app. Refresh the session list if the app was already open when the file was written.

## Portable export

```text
dcp-session migrate plan --source "<pi.jsonl>" --target portable --export-dir "<existing directory>" --plan-file "<new plan.json>"
```

After approval, use the same apply command. Move the complete output folder to keep the DSH JSONL and attachments together. Its directory is the attachment home for that copy.

## Checks

- `migrate sources` reads only headers. Use `--pi-home` when the source uses a non-default Pi agent directory.
- `migrate environment` shows the script's current host and paths to use as suggestions.
- `migrate verify-web --url-file "<launch URL file>" --session-id "<id>" --events <count>` checks the list and history. Use the receipt's event count. The private file contains one launch URL belonging to the confirmed Web instance.
- `written` confirms the disk write. `verified` confirms both Web reads.
