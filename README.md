# OBS Playing

Production-ready Tauri 2 application for OBS "Now Playing" widget.

## Structure
- `apps/desktop`: Tauri application (Rust + Vue 3)
- `apps/browser-extension`: Plasmo-based browser extension
- `packages/shared`: Types and shared logic

## Development
1. Install dependencies: `bun install`
2. Start desktop app: `bun --filter desktop dev`
3. Start extension: `bun --filter browser-extension dev`

## Windows cross-build

Windows x64 NSIS installers can be built entirely on Linux or WSL with `bun run build:windows`. See [Windows cross-builds and releases](docs/windows-releases.md) for prerequisites, artifact paths, updater signing, and release CI details.

## Features
- Windows Global Media Controls integration
- Browser extension (YouTube, Yandex Music, etc.)
- Real-time WebSocket updates
- Customizable OBS Browser Source widget
