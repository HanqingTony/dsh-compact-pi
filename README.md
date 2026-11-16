# dsh-compact-pi (dcp)

An installable pi extension hosting **unmodified DeepSeek Harness compaction plugins in real Cordis**. DCP adapts a defined common subset of pi and DSH; its source updater copies upstream files without rewriting imports or patching the compression algorithm.

Requires pi 1.5.2 and Node.js >=24.9.0 (matching the upstream source runtime requirement). DCP's version uses the upstream DSH base version plus its own build number: currently **0.2.2b2** (DSH base 0.2.2, DCP build 2). The npm SemVer is `0.2.2-b2`; `/dcp-status` and Ctrl+O display `0.2.2b2`. Subsequent DCP builds increment `b2`, `b3`, etc., independently of the upstream snapshot. The exact DSH snapshot is 0.2.2-rc.1, pinned in [vendor/manifest.json](vendor/manifest.json) and shown separately by `/dcp-status`. Running or building DCP does not require a DSH checkout.

## Install and use

```bash
pi install git:github.com/HanqingTony/dsh-compact-pi@v0.2.2-b2
```

Restart pi or `/reload`, then `/dcp-status`. The Git tag pins this release. To follow future releases on the default branch, use `pi install git:github.com/HanqingTony/dsh-compact-pi`. Before switching from a local DCP installation, use `pi list` and `pi remove <old-source>` to remove the old package entry and avoid loading DCP twice. To install a development checkout, use `pi install /absolute/path/to/dsh-compact-pi`. For one run:

```bash
pi --no-extensions -e /absolute/path/to/dsh-compact-pi/dist/index.js
```

| Command | Behavior |
|---|---|
| `/dcp-status` | Loaded versions, policy budgets and compatibility scope |
| `/dcp-compact` | Manual upstream `compactNow()` through pi's compaction controller; idle only, no arguments |
| `/compact` | Pi's standard command intercepted by DCP; use while idle, without instructions |

Automatic pressure checks use DSH's `agent/pre-step` listener. Overflow decisions and budgets belong to DSH's `agent/request-error` listener. Manual compaction uses DSH's `compactNow()`, including its persistence checkpoint. DCP does not add manual pre-pruning, an emergency pressure fallback, a fixed 8K summary cap, or adaptive headroom.

Do not load bcp/bcp-lean or another context-rewriting extension alongside DCP. The project configuration in this checkout disables those packages locally. This release is distributed through GitHub; npm publication is pending.

## Compatibility scope

The supported comparison scenario is a **fixed physical model, text, user/tool-result images and ordinary tool messages, and no user input during compaction**. Submitted input is rejected with a retry-later notice rather than queued by DCP. PNG/JPEG/WebP/GIF images participate in upstream summarization and image offloading. General file attachments, assistant image output and virtual routing remain outside this scope: DCP preserves the original context and explicitly reports the unsupported capability. It never silently replaces DSH with pi's default summarizer.

Pi retains its own session format, branches, names, labels and extension state. DCP records request changes through `pi.appendEntry` before using them; at a safe boundary it also emits native `context_edit`/`compaction` entries. Pi is the sole writer of that session file. Existing `dcp`/`zcp` checkpoint records remain readable.

The adapter compares the finalized model-visible context, not original streaming timings or byte-identical provider payloads. Pi's native manual-compaction admission check still runs before the extension hook. Advanced routing, general file-attachment offload, input queuing and exact provider cache behavior are not emulated. See the precise contract in [docs/compatibility.md](docs/compatibility.md).

## Ctrl+O diagnostics

Expand a `[compaction]` card with `Ctrl+O`. Its display identifies DCP, pi native, or another extension. New DCP cards show plugin/DSH version, trigger, summary model, token estimates, message counts, summary/prune/image-offload counts and duration. The renderer adds this information only to the display, not to the saved summary or model context. Historical records without these fields are identified as historical rather than attributed to the currently loaded version.

## Images

User images and tool screenshots no longer disable compaction. The unmodified DSH local attachment backend validates and normalizes them into durable references; the summary request reads those references as real images. Images in the retained tail remain available. Text pruning preserves accompanying pictures.

The unmodified `compaction-image-offload` plugin handles image-count/encoded-byte admission failures in both the main request and summary request. It omits the oldest image occurrences and records permanent `image/offload` decisions. Placeholders name the attachment and its normalized read-only path. The decision survives cancellation after commit, restart and native pi context edits; a later read can introduce a fresh image occurrence.

The compatibility adapter uses pi's declared `inputLimits.images.maxPerRequest` / `maxPerMessage`; absent a request count limit it uses the upstream pi-ai default of 50, with a 20 MiB base64-image budget. Summary request versions follow the upstream 4-megapixel / 1 MiB defaults, further constrained by pi's declared resize dimensions/byte cap. Unstructured remote provider errors are not guessed into image-offload counts. A text-only summary model is rejected when its selected prefix still contains retained images.

The upstream pi-ai adapter does not declare exact image-token pricing. DCP likewise uses upstream attachment-reference heuristics and provider usage anchors; it never charges the base64 string as text tokens. Before a usable provider sample, this can underestimate visual pressure.

For persistent pi sessions, normalized objects live under `.dcp-assets/` beside the session file; in-memory sessions use the configured pi agent directory (default `~/.pi/agent`). The backend writes its request cache under that same attachment home. Keep those objects if you need the read-only recovery paths. No automatic asset garbage collection is provided. `sharp` is a production dependency and uses its platform-specific native binaries.

`dcp-session pi2dsh` writes valid attachment references to `DSH_HOME` (default `~/.dsh`) and keeps the byte-exact pi archive. Foreign DSH imports read that same attachment store and replay offloads before embedding retained images into pi; missing assets fail explicitly. The legacy synchronous core codec has no automatic attachment resolution; use the CLI for image sessions.

## Configuration

Optional `.pi/dcp.json`:

```json
{
  "policy": {
    "thresholdRatio": 0.8,
    "retainRatio": 0.16,
    "compactionRetries": 1,
    "maxOverflowRetries": 1
  },
  "audit": true
}
```

`policy` is passed to upstream without extra DCP policy defaults. DSH's default headroom is **65,536** tokens, and omitted `maxTokens` inherits headroom. These are output upper bounds, not target summary lengths. Exact `modelPolicies`, paired summarization model/provider overrides, and `retainTokens` instead of `retainRatio` use upstream validation. `auto: false` leaves only manual compaction enabled. `.pi/zcp.json` is accepted if the new filename is absent.

Small-window models need an explicit policy that fits their model budget. For example, for a 32K context model reserving 8K output:

```json
{
  "policy": {
    "headroomTokens": 2048,
    "maxTokens": 4096,
    "retainTokens": 4096
  }
}
```

Retention settings apply to automatic pressure. Manual compaction follows upstream's zero-retention-budget selection, preserving only the last balanced tail. `audit: false` omits detailed DSH events but retains checkpoint replay/provenance. Reload after configuration changes.

## Updating upstream

```bash
npm ci
npm run vendor:dsh -- /path/to/deepseek-harness
npm run vendor:verify -- /path/to/deepseek-harness
npm run check
npm run test:package
```

The updater traverses **source** imports, copies the required TS/JS and dependency files byte-for-byte into `vendor/dsh-source/`, records import resolutions and SHA-256 hashes, and builds from that local copy. It does not use DSH's `lib/` artifacts and does not modify source imports. Normal builds verify the copied files and rebuild the kernel without consulting the upstream checkout.

The pi compatibility layer lives in `src/dsh/engine.ts`, `src/dsh/llm.ts`, `src/dsh/sync.ts` and `src/bridge.ts`. It supplies model I/O, maps pi operations to Cordis events and translates persisted projections. Compatible upstream changes require no compression-source edits. A changed service/export contract can still require adapter/resolver updates; failed checks must be resolved before shipping. Details: [docs/upstream-update.md](docs/upstream-update.md).

## Validation and packaging

```bash
npm run check          # strict typecheck, source rebuild, tests and real pi SDK integration
npm run test:package   # package, isolated install, copied-source rebuild, pi install/load
```

Differential tests compare the adapter with direct upstream Cordis plugin execution: summary input/budget, logical selected spans, prune/replace events, final surfaces, no-op/failure results, flush checkpoints and retry decisions. Runtime IDs/timestamps and host-specific seed offsets are excluded. Other tests cover real TypeBox tool schemas, usage pricing, durability, branches, Ctrl+O, cancellation, scope rejection and input rejection. Provider replies are deterministic stubs; paid live-model fidelity benchmarks are not implied.

The distributable is `dsh-compact-pi-0.2.2-b2.tgz`. It can be installed with `npm install ./dsh-compact-pi-0.2.2-b2.tgz`, followed by `pi install /absolute/path/to/node_modules/dsh-compact-pi`. It contains the copied source closure and built extension.

For npm/Git publication, version tags and public installation instructions, see [the publishing guide](docs/publishing.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).

## Session conversion

```bash
dcp-session dsh2pi old.dsh.jsonl imported.pi.jsonl
pi --session imported.pi.jsonl
dcp-session pi2dsh session.pi.jsonl exported.dsh.jsonl
dcp --session old.dsh.jsonl
```

The launcher imports into a new pi file and preserves the source DSH file. Pi-origin exports retain exact pi entries in ignorable `plugin:dcp/pi-header` and `plugin:dcp/pi-entry` records, including legacy `plugin:zcp` records on import. Foreign DSH imports use their active message surface; DSH-only UI state and attachment-store references are not a complete pi session translation. `.zstd` reading requires the `zstd` command; compressed writing is unsupported.

If an old v0.1 core codec patch is installed, export needed sessions and restore it with `node scripts/patch-pi.mjs --restore` before using the normal extension. See [migration details](docs/native-session-codec.md).

## License

MIT. Upstream licenses and source provenance are in `vendor/LICENSE-DeepSeek`, `vendor/LICENSE-pi`, `vendor/THIRD-PARTY-NOTICES` and `vendor/manifest.json`.
