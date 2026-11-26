# Testing DCP

Clone the repository with its Git history and install dependencies with `npm ci`. Use Node.js `^24.22.3 || >=26.13.1`. Tests use synthetic sessions and stub providers.

| Command | Coverage |
|---|---|
| `npm run check` | Type checks, verifies and rebuilds the vendored runtime, builds the extension and CLI, and runs the regression suite |
| `npm run test:package` | Packs the release, installs it in isolation, verifies bundled upstream sources, rebuilds them, and exercises image handling and the pi loader |
| `npm run test:resume -- 1.5.2` | Generates checkpoints with published DCP 0.2.2b3 and pi 1.5.2, then checks resume and migration on pi 1.5.2 |
| `npm run test:resume -- 1.6.0` | Repeats the same checks on pi 1.6.0. Pass another exact version to check a candidate upgrade |
| `npm run vendor:verify -- /path/to/deepseek-harness` | Compares the vendored source closure byte for byte with the matching upstream checkout and dependencies |

The normal regression suite covers DSH pressure and overflow policy, Esc cancellation, signed thinking and tool schemas, summary model selection, journal replay, native checkpoints, attachment handling, and a native DSH checkpoint import. To rerun the image migration and upstream differential tests after a build, use:

```bash
node --import tsx --test test/images-convert.test.ts test/differential.test.ts
```

The resume test generates a native pi checkpoint and a separate snapshot cut at the DCP journal commit. On the candidate pi it checks that the next provider request contains the old summary, a retained message and the new user request. It disables fresh summarization during replay so a lost checkpoint fails the test. It also runs the packaged CLI in both directions, checking for inactive branch leakage, native context edits, archive fidelity and continued work after adding a message in DSH.

The baseline bundle comes from Git commit `1f43099c0273a3edcbe5353a4aaf32884efd1fc9`. The candidate pi package is installed from npm into a temporary directory. If a shallow clone lacks the baseline, fetch the `v0.2.2-b3` tag before running the test. Other builds and the unit suite can run without that Git history.

The **Pi session compatibility** workflow runs on pushes to main and pull requests. Run it manually with an exact candidate pi version before extending the supported matrix. CI uses Ubuntu and stubbed provider responses. It checks session behavior through the SDK and packaged CLI at the pinned DSH snapshot, without measuring live-model summary quality.
