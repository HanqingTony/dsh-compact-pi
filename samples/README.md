# Local DSH session samples

Local `current-session.*` files contain real conversation data and are ignored by git. They are not part of the published package.

Import a sample into a new pi session:

```bash
node dist/dcp-session.mjs dsh2pi samples/current-session.v4.jsonl imported.pi.jsonl
pi --session imported.pi.jsonl
```

The source DSH file is preserved. The imported header retains its original working directory. Install dcp with `pi install /absolute/path/to/dsh-compact-pi` before opening the imported session; no codec patch is needed.
