# Publishing dsh-compact-pi

Use Node.js >=24.9.0. The package version `0.2.2-b3` corresponds to the displayed version `0.2.2b3`. Keep the upstream DSH base version and increment the DCP build suffix for subsequent releases.

## Verify a release

```bash
npm ci
npm run check
npm run test:package
npm publish --dry-run
```

`test:package` creates the tarball and checks an isolated production installation, a rebuild from the included upstream source and loading through pi. Review the packed file list before publication; credentials and session data must not be included.

## npm

Authenticate interactively with `npm login`, then verify the intended publisher with `npm whoami`. Do not put authentication tokens in this repository.

```bash
npm publish --access public --tag beta
```

The package's `publishConfig` defaults to the public npm registry and the `beta` tag because this version is a prerelease. Consumers can install the exact release with:

```bash
pi install npm:dsh-compact-pi@0.2.2-b3
```

Restart pi or run `/reload`, then `/dcp-status`. Remove a previous local DCP package entry before loading the published package to avoid registering the extension twice. Run `pi list` to identify the installed source and `pi remove <source>` to remove it.

The `pi-package` keyword makes a published npm package eligible for discovery in the pi package gallery. Publication does not guarantee immediate gallery indexing.

## Git

The current distribution channel is GitHub:

```bash
pi install git:github.com/HanqingTony/dsh-compact-pi@v0.2.2-b3
```

A Git release must include `dist/`, `vendor/` and the package manifest so installing it does not require development dependencies or an upstream checkout. Tag only the verified release commit. Keep source provenance and third-party licenses in the repository and tarball. npm publication is pending and is not required for Git installation.

Tags pin installations: publishing a new tag does not upgrade users pinned to an older one. Tell users to install the new tag explicitly, or omit the ref to follow `main`. In pi 1.5.2, `pi update` updates pi itself; package updates use `pi update --extensions` or `pi update <source>`. Document the reload and version check with each release. See [Updating an existing installation](../README.md#updating-an-existing-installation) for the user-facing commands.

After publishing, update the README with the verified public installation URL and create release notes from `CHANGELOG.md`.
