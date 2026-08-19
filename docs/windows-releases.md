# Windows cross-builds and releases

Windows x64 builds use Tauri's supported MSVC cross-compilation path: `cargo-xwin` supplies the Microsoft CRT and Windows SDK, LLVM/LLD links the executable, and NSIS creates the installer. The build runs entirely on Linux and does not execute the Windows application.

Tauri can cross-build an NSIS `-setup.exe` on Linux. It cannot create an MSI there because WiX v3 only runs on Windows. The release therefore publishes NSIS and its updater signature, not an MSI. The configured `downloadBootstrapper` mode keeps the installer small and downloads the WebView2 bootstrapper when WebView2 is absent; installation requires network access in that case.

## Ubuntu and Debian

Install the system tools, Rust, Bun, and `cargo-xwin` once:

```sh
sudo apt-get update
sudo apt-get install --yes clang lld llvm nsis curl unzip
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://bun.sh/install | bash
cargo install --locked cargo-xwin --version 0.21.4
bun install --frozen-lockfile
```

The committed `rust-toolchain.toml` installs `x86_64-pc-windows-msvc` when rustup enters the repository. If automatic toolchain installation is disabled, run `rustup target add x86_64-pc-windows-msvc` explicitly.

Use a shared SDK cache so Microsoft toolchain files are not downloaded for each checkout, then build from the repository root:

```sh
export XWIN_CACHE_DIR="$HOME/.cache/cargo-xwin"
bun run build:windows
```

The installer is written below `apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`. This normal local build disables updater artifacts because it has no signing key; it still produces the complete unsigned NSIS installer. Running the generated executable is not part of the build and is not required.

## WSL2 Ubuntu

Use the same packages and commands as native Ubuntu. Keep the repository in the WSL filesystem, such as `~/Code/obs-playing`, rather than under `/mnt/c`; Rust and Bun caches perform substantially better there. WSL interoperability and a Windows Rust installation are not required because compilation and NSIS packaging happen inside WSL.

## Updater signing

Generate the Tauri updater key pair locally and keep the private key and password outside the repository:

```sh
bun run --cwd apps/desktop tauri signer generate -- -w ~/.tauri/obs-playing.key
```

For a signed local build, replace the placeholder public key only in a local uncommitted config and provide both signing variables:

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/obs-playing.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='your-key-password'
export XWIN_CACHE_DIR="$HOME/.cache/cargo-xwin"
bun run --cwd apps/desktop build:windows:cross:signed
```

The committed `__TAURI_UPDATER_PUBLIC_KEY__` is intentionally unusable. Never commit the generated private key or print it in CI logs.

## GitHub release CI

Pushing a SemVer tag such as `v1.2.3` runs `.github/workflows/release.yml` on `ubuntu-24.04`. The workflow validates signing settings, derives the Cargo and Tauri version from the tag, cross-builds only Windows x64 NSIS, uploads the setup executable and `.sig`, and generates `latest.json` with the NSIS URL.

Configure these repository settings:

- Secret `TAURI_SIGNING_PRIVATE_KEY`: complete updater private key contents.
- Secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: updater key password.
- Variable `TAURI_UPDATER_PUBLIC_KEY`: complete public key string printed by the signer.

`GITHUB_TOKEN` is supplied automatically and the workflow retains `contents: write` for release publishing. Bun's package download cache, Rust crates and target artifacts, the cached `cargo-xwin` binary, and the downloaded Windows SDK/CRT are reused across runs. Cache keys still allow intentional `cargo-xwin` upgrades.

Publish a release with:

```sh
git tag v1.2.3
git push origin v1.2.3
```

Do not reuse or move a published release tag. Each tag version must be greater than the version currently installed by users.

Updater signing authenticates update archives but does not provide Windows Authenticode signing. A cross-built installer will still show SmartScreen warnings unless a separate cross-platform Tauri `bundle.windows.signCommand` and a Windows code-signing service or certificate are configured.
