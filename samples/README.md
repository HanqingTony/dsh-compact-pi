# DSH session samples

`current-session.v4.jsonl` (and its `.zstd` original) is a copy of the live
DeepSeek Harness session for this project at the time it was exported. It
contains the real conversation; do not commit or share it. The JSONL copy is
ignored by git.

## Import into pi

The DSH session codec patch makes plain `pi` understand DSH v4 JSONL directly:

```bash
cd /home/tony/zrepo/zcp
# work on a copy; pi appends to the file it opens
cp samples/current-session.v4.jsonl /tmp/imported.v4.jsonl

pi --approve --session /tmp/imported.v4.jsonl
```

`--approve` trusts this project so `.pi/settings.json` (zcp active, bcp/bcp-lean
disabled) applies. Without the codec patch, use the launcher:

```bash
zcp --session /tmp/imported.v4.jsonl
```

Or convert to pi JSONL first:

```bash
zcp-session dsh2pi samples/current-session.v4.jsonl /tmp/imported.pi.jsonl
pi --approve --session /tmp/imported.pi.jsonl
```

Notes:

- The session header keeps the original `cwd`; tools in the imported session
  start there. Change the first JSONL line's `cwd` if you want a different
  working directory.
- `pi --session` appends to the file. Always import a copy, not the sample.
- A 9.7 MB DSH log is large; expect a slow first load and a large context.
  With a small-window model, zcp will compact it at the first request.
