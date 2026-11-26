# Publishing dsh-compact-pi

Use Node.js `^24.22.3 || >=26.13.1`. The package version `0.2.3-b2` corresponds to the displayed version `0.2.3b2`. Keep the upstream DSH base version and increment the DCP build suffix for subsequent releases.

## Verify a release

```bash
npm ci
npm run check
npm run test:package
npm run test:resume -- 1.5.2
npm run test:resume -- 1.6.0
```

`test:package` creates the tarball and checks an isolated production installation, a rebuild from the included upstream source and loading through pi. Review the packed file list before publication; credentials and session data must not be included.

See [testing](testing.md) for the resume and migration matrix. If the source snapshot changed, compare it to the exact upstream checkout with `npm run vendor:verify -- /path/to/deepseek-harness`.

## npm

Authenticate interactively with `npm login`, then verify the intended publisher with `npm whoami`. Do not put authentication tokens in this repository.

```bash
npm publish --access public --tag beta
```

The package's `publishConfig` defaults to the public npm registry and the `beta` tag. The public `latest` tag currently points to `0.2.3-b2`. Users can install it with `pi install npm:dsh-compact-pi@latest` or pin the exact version:

```bash
pi install npm:dsh-compact-pi@0.2.3-b2
```

Restart pi or run `/reload`, then `/dcp-status`. Remove a previous local DCP package entry before loading the published package to avoid registering the extension twice. Run `pi list` to identify the installed source and `pi remove <source>` to remove it.

The package is listed in the [Pi package catalog](https://pi.dev/packages/dsh-compact-pi). The `pi-package` keyword keeps future releases eligible for discovery. Check the registry tag and the gallery page after publishing.

## Git

GitHub also hosts tagged releases:

```bash
pi install git:github.com/HanqingTony/dsh-compact-pi@v0.2.3-b2
```

A Git release must include `dist/`, `vendor/` and the package manifest so installing it does not require development dependencies or an upstream checkout. Tag only the verified release commit. Keep source provenance and third-party licenses in the repository and tarball.

Tags pin installations: publishing a new tag does not upgrade users pinned to an older one. Tell users to install the new tag explicitly, or omit the ref to follow `main`. In pi 1.5.2, `pi update` updates pi itself; package updates use `pi update --extensions` or `pi update <source>`. Document the reload and version check with each release. See [Updating an existing installation](../README.md#updating-an-existing-installation) for the user-facing commands.

Update the README and help to reference the new tag. After validation, commit the source and generated files, push the commit and annotated version tag, and create a GitHub prerelease with the matching section of `CHANGELOG.md` and the tarball produced by `test:package`. Install the public tag in a temporary pi agent directory and verify that the extension loads and exposes its commands.
