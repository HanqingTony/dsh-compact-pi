# Testing DCP

Clone the repository with its Git history and install dependencies with `npm ci`. Use Node.js `^24.22.3 || >=26.13.1`. Tests use synthetic sessions and stub providers.

| Command | Coverage |
|---|---|
| `npm run check` | Type checks, verifies and rebuilds the vendored runtime, builds the extension and CLI, and runs the regression suite |
| `npm run test:package` | Packs the release, installs it in isolation, verifies bundled upstream sources, rebuilds them, and exercises image handling and the pi loader |
| `npm run test:resume -- 1.6.1` | Installs the DCP tarball, tests automatic and manual image compaction on pi 1.6.1, and checks resume and DSH migration from released DCP 0.2.2b3 sessions. Pass another exact version to check a candidate upgrade |
| `npm run vendor:verify -- /path/to/deepseek-harness` | Compares the vendored source closure byte for byte with the matching upstream checkout and dependencies |

The normal regression suite covers DSH pressure and overflow policy, Esc cancellation, signed thinking and tool schemas, summary model selection, journal replay, native checkpoints, attachment handling, and a native DSH checkpoint import. To rerun the image migration and upstream differential tests after a build, use:

```bash
node --import tsx --test test/images-convert.test.ts test/differential.test.ts
```

The resume test installs the built npm tarball in a temporary directory and loads its extension in the candidate pi SDK. It exercises automatic compaction and pi's manual compaction path with a retained PNG. Both paths must save a native compaction checkpoint and image assets, continue with the summary and retained image, and preserve them when the session is reopened.

Run `node --import tsx --test test/migration.test.ts` on Windows or Linux to test explicit destination selection, read-only planning, stale plans, duplicate IDs, encoding conflicts, and opt-in recovery of Pi entries. The GitHub Actions matrix runs this test on both hosts. For desktop release checks, also open a synthetic imported session in the target app and verify its history.

The test also generates a native pi checkpoint and a separate snapshot cut at the DCP journal commit using an earlier DCP release. On the candidate pi it checks that the next provider request contains the old summary, a retained message and the new user request. It disables fresh summarization during replay so a lost checkpoint fails the test. It runs the CLI in both directions, checking for inactive branch leakage, native context edits, archive fidelity and continued work after adding a message in DSH.

The baseline bundle comes from Git commit `1f43099c0273a3edcbe5353a4aaf32884efd1fc9`. The candidate pi package is installed from npm into a temporary directory. If a shallow clone lacks the baseline, fetch the `v0.2.2-b3` tag before running the test. Other builds and the unit suite can run without that Git history.

The **Pi session compatibility** workflow runs the same test on Ubuntu and native Windows for pi 1.5.2 and the candidate version. Run it manually with an exact candidate pi version before extending the supported matrix. On Windows, run `npm ci` and `npm run test:resume -- 1.6.1` in a native terminal with Windows Node.js and Git for Windows available on `PATH`. Both platforms use stubbed provider responses to verify session behavior. Summary quality with a live model is outside the test's scope.
