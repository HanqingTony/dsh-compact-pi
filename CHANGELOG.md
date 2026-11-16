# Changelog

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
