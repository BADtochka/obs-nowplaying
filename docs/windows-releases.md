# Windows releases and updater signing

Windows releases are built on `windows-latest` when a SemVer tag such as `v1.2.3` is pushed. The workflow publishes NSIS and MSI installers, their updater signatures, and `latest.json` to the matching GitHub Release.

## One-time signing setup

Generate the Tauri updater key pair locally. Keep the private key and its password outside the repository:

```sh
bun run --cwd apps/desktop tauri signer generate -- -w ~/.tauri/obs-playing.key
```

Configure these GitHub repository settings:

- Secret `TAURI_SIGNING_PRIVATE_KEY`: the complete private key file contents.
- Secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the password used while generating the key.
- Variable `TAURI_UPDATER_PUBLIC_KEY`: the complete public key string printed by the signer.

The committed `__TAURI_UPDATER_PUBLIC_KEY__` value is intentionally not a usable key. The release workflow fails before building if any required setting is absent and replaces the placeholder only in the runner workspace. Never commit `obs-playing.key` or expose its contents in workflow output.

For a local signed production build, replace the placeholder in a local uncommitted config and set `TAURI_SIGNING_PRIVATE_KEY` plus `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in the process environment. Development builds do not perform startup update checks.

## Publishing

Ensure the release commit is on the remote, then create and push the next version tag:

```sh
git tag v1.2.3
git push origin v1.2.3
```

Do not reuse or move a published release tag. Each tag version must be greater than the version currently installed by users.
