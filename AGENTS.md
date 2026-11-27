# dsh-compact-pi maintainer guide

DCP adapts DeepSeek Harness compaction to pi. Keep the upstream algorithm in the vendored Cordis plugins and put host differences in the adapter.

- `src/index.ts` owns pi commands and hooks. `src/bridge.ts` owns transaction replay and the conversion to native pi checkpoints. `src/dsh/` translates sessions, model requests and attachments.
- `src/codec.ts` and `src/dsh/convert.ts` handle offline migration. Keep pi's active projected context separate from its archived entries. Exercise both native checkpoints and journal-only checkpoints when changing replay or migration.
- `src/dsh/import.ts` adds an exported session to the pinned DSH JSONL store. When updating the source snapshot, verify imports with that DSH version's persistence backend for Zstandard and plaintext, including a retained image. Keep the packaged migration skill and help aligned with the supported DSH version.
- Pi owns its live session files. Preserve original session logs and attachments when investigating or migrating. Use synthetic inputs or temporary copies for tests. Keep real conversations, credentials and local session fixtures out of Git and release assets.
- Update `vendor/dsh-source/` with `npm run vendor:dsh -- /path/to/upstream`. Use the exact upstream tag and its locked dependencies. Keep upstream source unmodified and update the adapter or source resolver when contracts change. The generated runtime, pi projection and manifest belong in the same change.
- Use Node.js `^24.22.3 || >=26.13.1`. After a clean `npm ci`, run `npm run check` and `npm run test:package` for release changes. Run `npm run test:resume -- <pi-version>` for host compatibility. Run `npm run vendor:verify -- /path/to/upstream` after a snapshot change. See [test coverage and prerequisites](docs/testing.md).
- Keep `version`, `dcpVersion`, the lockfile and release notes aligned. Preserve the Git history used by the compatibility test. Commit the built extension and CLI in `dist/` so pi can install a Git tag directly. Keep published tags fixed and follow [the release procedure](docs/publishing.md).

Update [user help](docs/help.md) and the README when commands, configuration or migration behavior change.
