# Releasing Files

Files is distributed as a `.webhapp` referenced by the
[weave-tool-curation](https://github.com/lightningrodlabs/weave-tool-curation)
list. A release is **UI-only**: it bundles the current UI with the *exact same*
frozen happ as every previous release on the same line, so all installs stay on
the same DNA / network and existing users' data is preserved.

## Which artifact ships

There is only one happ — `artifacts/files.happ`, packed from
`dna/workdir/happ.yaml` (manifest name `Files we-applet`). Two web-happ
manifests embed it:

| manifest | name | output | shipped? |
|---|---|---|---|
| `we-applet/webhapp.workdir/web-happ.yaml` | `Files Official We-applet` | `artifacts/files-we_applet.webhapp` | **yes — this is the Moss/Weave tool** |
| `webapp/webhapp.workdir/web-happ.yaml` | `Files Official` | `artifacts/files.webhapp` | no — standalone browser/hc-launch build only |

`npm run package`, `npm run weave-hash` and the release workflow all operate on
the we-applet webhapp.

## The 0.7 line is a new network

This branch targets Holochain 0.7, which has no data migration path from 0.6:
the DNA hash changed, 0.6 and 0.7 conductors cannot read each other's databases,
and 0.6 and 0.7 agents form disjoint networks. Files stored on the 0.6 line do
not carry over, and everyone in a group has to move together.

## Why the happ is frozen (never rebuilt)

The zome wasm embeds the builder's absolute paths (`~/.cargo/...` and source
paths via the HDK macros). That makes the happ **non-reproducible** on a
different machine/user or in CI — a rebuild produces a different DNA hash, i.e. a
different network. The happ is built once and those exact bytes are reused
forever.

The canonical bytes live as the `happ-v<dnaVersion>` GitHub release (tag in
`.happ-version`); their sha256 is recorded in `.happ-sha256` and checked by both
`scripts/release-happ.sh` and the release workflow.

> ⚠️ Do **not** release by uploading the output of `npm run package`. That reuses
> whatever `artifacts/files.happ` happens to be on disk. Releases must go through
> the tag-triggered workflow below, which downloads the frozen happ.

## One-time per DNA version: publish the canonical happ

```bash
nix develop --command bash -c "npm run build:happ:release"
sha256sum artifacts/files.happ | awk '{print $1}' > .happ-sha256   # first time only
nix develop --command bash scripts/release-happ.sh
```

`build:happ:release` is the canonical build: it runs `wasm-opt -Oz` over every
zome before packing. A plain `npm run build:happ` skips that and produces
**different bytes and a different DNA hash** — that is deliberate, so local dev
builds never join the canonical network.

If the local build does not match `.happ-sha256` (a different machine, a
`cargo clean`, a dependency bump), the script refuses. That mismatch is the
tripwire that stops a silent network fork. Deliberately starting a new DNA line
means bumping `dnaVersion` in `package.json`, updating `.happ-version`, and
writing the new sha into `.happ-sha256`.

## Each release: cut a webhapp

1. Bump `version` in `package.json` (must be higher than the installed version
   for Moss to offer it as an upgrade), then `npm run update-version` to
   propagate it to the workspaces.
2. Commit, then:

   ```bash
   npm run release:webhapp        # tags v<version> and pushes
   ```

3. The [`release-webhapp`](.github/workflows/release-webhapp.yaml) workflow then:
   - downloads the frozen happ from `happ-v<dnaVersion>` into `artifacts/` and
     checks its sha256 against `.happ-sha256`,
   - builds the UI and packs `files-we_applet.webhapp` (the happ is embedded
     verbatim — never rebuilt),
   - re-verifies the embedded happ still equals the frozen DNA,
   - prints the three curation hashes to the run summary,
   - publishes a **prerelease** GitHub release with `files-we_applet.webhapp`
     attached. It is deliberately not a draft: draft assets are not served at the
     public `releases/download/<tag>/...` URL Moss fetches, so they 404.
4. Nothing is live yet — updating the curation list below is the go-live gate.

## Update the curation list

The workflow run summary (and the release body) contains:

```json
"hashes": {
  "happSha256": "<frozen DNA — unchanged across UI releases>",
  "webhappSha256": "<new>",
  "uiSha256": "<new>"
}
```

Add a new `versions[]` entry for `files` in the 0.16 curation list with the new
`version`, the release's `files-we_applet.webhapp` `url`, and these hashes.
Because `happSha256` is unchanged, Moss treats it as an in-place upgrade on the
same network. To get the hashes for a local artifact: `npm run weave-hash`.

## `build-webhapps.yml` is verification only

`.github/workflows/build-webhapps.yml` (called by `test.yml`) rebuilds the happ
from source on every push/PR. That build is **never published** — its only job is
to prove the tree still compiles. The old `release-on-tag.yml`, which uploaded a
CI-rebuilt happ, was deleted for exactly this reason.

## TypeScript bindings

`webcomponents/src/bindings/*` is generated from the zome sources by
[zits](https://crates.io/crates/zits) and is **committed**. It is not part of
`build:happ`, because zits is a `cargo install` that neither the flake nor npm
provides. After changing a zome's extern signatures or types:

```bash
npm run install:zits      # cargo install zits --version <config.zits_version>
npm run build:bindings
```
