# zcp — z's compact

Run **DeepSeek Harness's real compaction engine** on pi, with a native
DSH-format session codec, the DSH tool-result pruner, and overflow recovery.

> v0.1.0. Tested against pi 1.5.0 and deepseek-harness 0.2.2-rc.1. The DSH
> compaction transaction is imported verbatim, not reimplemented.

## What it does

- **Native DSH session codec for plain `pi`.** `scripts/patch-pi.mjs` patches
  pi's session manager so `pi` writes DSH v4 JSONL
  (`{"type":"session","version":4,...}` + `turn/start`, `user/message`,
  `assistant/message`, `tool/call`, `tool/result`, ...). `pi --continue` reads
  it back. Old pi-format sessions upgrade on their next append.
- **Real DSH compaction.** `BasicCompactionEngine.compactRegion()` from
  `@deepseek-ai/dsh-compaction-basic` runs on a real
  `@deepseek-ai/dsh-session` `Session` and appends real
  `compaction/start` → `compaction/summary` → `surfaceOp: replace` checkpoint
  → `compaction/end`.
- **Native compaction is cancelled** by `session_before_compact`.
- **Real DSH tool-result pruner.** Oversized tool results become
  `compaction/prune` + a head/middle/tail replacement before range selection.
- **Overflow recovery.** `agent_end` detects context/length errors;
  `agent_before_settle` compacts and requests one continuation. At 95% of the
  window it compacts proactively.
- **Commands**: `/dsh-status`, `/dsh-compact`.

## Architecture

### Native mode (recommended): one DSH file

```
plain pi
  │  patched SessionManager
  │    loadEntriesFromFile: DSH -> pi entries
  │    _persist:             pi entry -> DSH event
  ▼
<session>.jsonl  (DSH v4)
  │
  └─ zcp context hook
       1. reload the DSH file when pi appended
       2. pressure -> pruner + BasicCompactionEngine.compactRegion()
       3. projectSurface(DSH) -> pi messages
       4. write the compacted DSH file
```

zcp detects the native DSH file and uses it as the canonical log; no
`.dsh/` sidecar is written in this mode.

### Plugin-only mode: sidecar

Without the pi patch, pi writes pi JSONL and zcp keeps:
`<session-dir>/.dsh/<name>.jsonl` (plus `.meta.json`). The `.dsh/` subdirectory
is hidden from pi's session scanner.

## Install

```bash
cd /home/tony/zrepo/zcp

# build the plugin, codec, and CLIs
npm run build

# install the native codec into pi (backs up the originals)
node scripts/patch-pi.mjs

# load the compression plugin for one run
pi --no-extensions -e ./dist/index.js
```

Remove the core patch at any time:

```bash
node scripts/patch-pi.mjs --restore
```

The patch is version-specific: re-run it after a pi upgrade. It copies the
self-contained codec to `<pi>/dist/dsh-pi-codec.mjs`, so the patched pi does
not need this checkout at runtime.

## Project configuration

This repo is also a project-scoped pi workspace. `.pi/settings.json`:

- disables the global `billion-context-pi-lean` (bcp-lean) and
  `billion-context-pi` (bcp) packages for this project via
  `autoload: false` filters;
- activates zcp from the repo root.

Run pi from this directory and approve the project once:

```bash
cd /home/tony/zrepo/zcp
pi
```

The project settings only apply after project trust; `pi --approve` trusts for
one run.

Do **not** load bcp / bcp-lean / billion-context alongside zcp: all of them
cancel native compaction and rewrite the request.

## Commands

| Command | Behavior |
|---|---|
| `/dsh-status` | DSH event count, surface count, estimated tokens, threshold/retain, file path, native/sidecar mode |
| `/dsh-compact` | Force one DSH compaction now |

## Cross-format tools

```bash
# real DSH v4 session (even .zstd) -> pi session
zcp-session dsh2pi <session.v4.jsonl.zstd> <out.pi.jsonl>
pi --session <out.pi.jsonl>

# pi session -> DSH v4 session
zcp-session pi2dsh <pi.jsonl> <out.dsh.jsonl>

# launch pi on a DSH file without the core patch
zcp --session <dsh.jsonl> [pi args...]
```

## Validation

- `test/bridge.test.ts` — real engine, real `Session`, event/projection checks.
- `test/host.test.ts` — mock pi context, sidecar reload, overflow flag.
- `test/pruner.test.ts` — real DSH pruner (`compaction/prune`, 14,841 chars
  removed from a 20k-char tool result).
- `test/codec.test.ts` — sync codec write/read/append.
- `test/convert.test.ts` — pi ↔ DSH round-trip.

Live checks:

- Plain patched `pi` writes `version: 4` DSH JSONL; `--continue` resumes with
  contiguous `seq`.
- zcp + native codec + 12K-window model produced a real automatic compaction
  in the native file (`compaction/start`, `compaction/summary`, checkpoint,
  `compaction/end`), summary beginning with DSH's
  `## Primary Request and Intent`.
- A real DSH v4 session (`session.v4.jsonl.zstd`, 1,884 events / 408 messages)
  converted to pi JSONL; pi → DSH → pi preserved all 408 messages.
- An old pi-format session upgraded to DSH on its next append, seq contiguous.

## Limitations (v0.1.0)

- Text/tool surface; images are mapped but not tested; reasoning signatures
  are dropped.
- `context_edit`, branch/tree, and non-message entries (`model_change`,
  `thinking_level_change`, `session_info`, `label`, `usage`, native
  `compaction`) are not fully mapped into DSH.
- The native file may end with an open turn; DSH repair handles it on import.
- Summary target is the current pi model via `modelRegistry.complete`.
- No zstd write; converters read `.jsonl.zstd`.
- The pi patch is tied to pi 1.5.0's function shapes and must be re-applied
  after upgrades.
- Do not run bcp / bcp-lean / billion-context together with zcp.

## Layout

```
src/index.ts          pi hooks, commands
src/bridge.ts         native/sidecar mode, sync, compaction, overflow
src/dsh/              DSH Session <-> pi mapping, engine, store
src/codec.ts          synchronous codec imported by the patched pi
scripts/patch-pi.mjs  install/restore the pi session-manager patch
bin/dsh-session.ts    zcp-session CLI source
bin/pi-dsh.ts         zcp launcher source
dist/index.js         bundled plugin
dist/codec.mjs        bundled codec (copied into pi on patch)
```

## License / attribution

MIT for the adapter and CLI. DSH packages are BSD-3-Clause; pi is MIT. DSH
code is imported and keeps its license/attribution.
