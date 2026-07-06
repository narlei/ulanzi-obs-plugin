# SETUP.md — build, install, and configure

This plugin controls **OBS Studio** from a **Ulanzi D200X** through **Ulanzi Studio**. It is a
Node.js UlanziDeck plugin. These steps assume no prior experience with the Ulanzi SDK.

> Status: 1.0.0 — implemented and verified on real D200X hardware.

## 0. Prerequisites

- **Ulanzi Studio** installed (the desktop app that drives the deck). Minimum version **2.1.4**.
  - macOS: download from Ulanzi's site and install the `.app`.
  - Windows: download and run the installer.
- **OBS Studio** with **obs-websocket v5** enabled (built in to OBS 28+):
  OBS → *Tools → WebSocket Server Settings* → **Enable WebSocket server**. Note the **Server Port**
  (default `4455`) and set/copy the **Server Password**.
- **Node.js 20+** and **npm** — only needed to *build* the plugin, not to run it (Ulanzi Studio ships
  its own Node 20 to run the built `dist/app.js`).
  - macOS: `brew install node`
  - Debian/Ubuntu: `sudo apt-get install -y nodejs npm` (or nodesource for v20+)
  - RHEL/Fedora: `sudo dnf install -y nodejs npm`
  - Windows: install from https://nodejs.org (LTS).

## 1. Build

From the plugin folder:

```
cd com.ulanzi.ulanziobs.ulanziPlugin
npm install
npm run build          # webpack bundles plugin/app.js -> dist/app.js
```

`npm run build` must produce `dist/app.js`. The manifest's `CodePath` points at `dist/app.js` for
the installed plugin. For live development you can instead point `CodePath` at `plugin/app.js` and run
`node plugin/app.js` yourself (see §4).

## 2. Install (sideload the plugin folder)

Ulanzi Studio loads plugins from a plugins folder it scans on startup. Copy (or symlink) the whole
`com.ulanzi.ulanziobs.ulanziPlugin/` folder into it, then restart Ulanzi Studio.

- **macOS [verify on arrival]:** the SDK documents only a Windows path. The macOS location is almost
  certainly `~/Library/Application Support/Ulanzi/UlanziStudio/plugins/` (Electron `userData`
  convention) — **confirm against your real install before relying on it.** To find it: install any
  plugin from Ulanzi's store, then search for its folder:
  `find ~/Library -type d -name "com.ulanzi.*ulanziPlugin" 2>/dev/null`.
- **Windows:** under `%AppData%\Ulanzi\UlanziStudio\` (the SDK references
  `~/AppData/Roaming/Ulanzi/UlanziStudio/` for logs; plugins sit alongside).

After copying, restart Ulanzi Studio. The **OBS Control** category should appear with 7 actions
(Record, Mute, Studio, Take, BRB, Scene) + the **Mic Gain** encoder action.

## 3. Configure OBS connection

Create `~/.config/ulanzi-obs/config.json` (this file is git-ignored — it holds your OBS
password). Start from `config.example.json` in the repo root:

```
mkdir -p ~/.config/ulanzi-obs
cp config.example.json ~/.config/ulanzi-obs/config.json
# then edit it: set "password" to your OBS WebSocket password, and "micInput" to your mic name.
```

Keys (all optional; defaults in parentheses): `host` (127.0.0.1), `port` (4455), `password` (""),
`micInput` ("Scarlett Solo"), `brbScene` (a scene-name PREFIX, "BRB"), `sceneColors` (map of scene or
sequence-base name → palette color: cyan|green|red|amber|slate|white).

## 4. Dev loop (fast reload) [verify on arrival]

For iterating without repackaging:

1. Point the manifest `CodePath` at `plugin/app.js` (unbundled).
2. Launch Ulanzi Studio with remote debugging so you can see logs:
   - macOS: `open "/Applications/Ulanzi Studio.app" --args --log --nodeRemoteDebug`
   - Node plugin logs attach via `chrome://inspect` using the manifest `Inspect` port (`9231`).
3. Edit files, then reload the plugin from Ulanzi Studio (or restart it).

The Ulanzi **Simulator** (in the SDK) can test key layouts in a browser without the device, but a Node
main service must be started manually and some device features won't render there.

## 5. Verify

- Ulanzi Studio shows the **OBS Control** actions; dropping one on a key paints a face.
- With OBS running + config set, keys reflect live state: Record floods red while recording, Mute
  shows the slashed mic when muted, Scene keys flood yellow when queued to Preview and their accent
  color when live on Program, BRB behaves the same in magenta.
- The Mic Gain encoder trims the mic level in OBS (0.2 dB per detent; press resets to 0 dB).
