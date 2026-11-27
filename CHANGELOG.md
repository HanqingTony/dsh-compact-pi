# Changelog

## [0.2.3-b4]

- Add `dcp-session migrate` and update the packaged skill to confirm the source, host, profile, and destination before writing. Support portable exports and direct imports for Windows Desktop, Linux desktop clients, Web, and TUI.
- Preview duplicate ID and mixed-log conflicts, require explicit approval before recovery or a new ID, and reject a plan when its source or destination changes.
- Write system messages inside their owning DSH step and preserve incomplete tool exchanges in the Pi archive. Verify imported Web sessions through both the list and history endpoints.

## [0.2.3-b3]

- Add `dcp-session pi2dsh-import` and the `dcp-migrate-to-dsh` skill. Import a selected Pi session directly into the DeepSeek Harness 0.2.3-alpha.2 store with its active summary, retained messages, images and archived Pi entries.
- Check the packaged extension on Pi 1.6.1. Run automatic and manual image compaction, session resume and bidirectional migration on native Windows and Ubuntu in CI.
- Make the CLI build and integration test runner work with Windows Node.js and preserve vendored source bytes across Git checkouts.

## [0.2.3-b2]

- Correct the lockfile integrity for `@aws/lambda-invoke-store@0.2.2` so a clean `npm ci` can install the development dependencies.
- Includes the summary model picker, bidirectional session migration, and pi compatibility tests introduced in 0.2.3b1.

## [0.2.3-b1]

- Export the active pi branch and its effective compressed context to DSH. Keep the original pi entries for unchanged round trips and import the live DSH surface after a session continues there.
- Add `/dcp-summary-model` to choose or reset the project default summary model and show the setting in `/dcp-status`.
- Sync the unmodified DeepSeek Harness `0.2.3-alpha.2` source snapshot (`4b399c39`).
- Adapt pi image limits to the upstream attachment encoder's separate hard byte limit and preferred size. Both use the same pi limit or the existing 1 MiB default.
- Use the upstream summary route projection, which prefers the last model that answered when no summary model is configured.
- Match the upstream Node.js requirement: `^24.22.3 || >=26.13.1`.
- Add an automated pi 1.5.2 and 1.6.0 resume and migration matrix, along with CLI help and maintenance documentation.

## [0.2.2-b3]

- Update the upstream DeepSeek Harness source snapshot to `0.2.2-rc.5` (`9c2670d3`), including shared error handling and session updates.
- Bundle the upstream-pinned Zod `4.6.6`. The existing pi adapter works with the new snapshot without source patches.

## [0.2.2-b2]

- Fix Esc during an ordinary tool call being reported as a DCP extension error even when no compaction occurred. Pi can invoke the context hook with an already-aborted signal after a tool returns; DCP now skips maintenance in that hook.
- Handle cancellation during a running context transform without rethrowing it as an extension failure, while preserving committed context changes.
- Add real pi SDK regression tests for tool and summary cancellation, no automatic retry after cancellation, and a subsequent user request.
- Keep automatic compaction and continuation policy unchanged; the upstream source snapshot is unchanged.

## [0.2.2-b1]

- Host the unmodified DeepSeek Harness compaction engine, token meter and tool-result pruner in Cordis through a pi extension.
- Support automatic, manual and overflow compaction, durable session checkpoints and branch-aware replay.
- Support user and tool-result images, upstream image offloading and attachment-aware session conversion.
- Add `/dcp-status`, `/dcp-compact` and Ctrl+O provenance and compaction statistics.
- Include the pinned upstream source closure and licenses; installation does not require a DeepSeek Harness checkout.

The displayed DCP version is `0.2.2b1`; the npm version is `0.2.2-b1`.
