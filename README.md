# ulanzi — OBS Control for the Ulanzi D200X

[![Available on Ulanzi Community Store](https://raw.githubusercontent.com/narlei/ulanzicommunitystore/main/docs/badges/ulanzi-community-store.svg)](https://ulanzicommunitystore.narlei.com)

A [UlanziDeck](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK) plugin (JavaScript / Node.js)
that controls **OBS Studio** from a **Ulanzi Stream Controller D200X**, with live state painted on the
keys and a rotary knob for mic gain. It began as a port of `mx-obs-plugin` (the same functionality
built for the Logitech MX Creative Console), moved to a cheaper, more-open control surface.

> **Status: 1.0.0 — implemented and verified on real D200X hardware.**

## What it does

| Action | Key/Knob | Behavior |
|--------|----------|----------|
| **Record** | key | Toggle OBS recording; the key floods red while recording. |
| **Mute** | key | Toggle mute on the mic input; red slashed-mic when muted. |
| **Studio** | key | Toggle OBS Studio Mode; floods green when on. |
| **Take** | key | Transition Preview → Program; flashes green on press. |
| **Scene** | key | Switch to a scene — Preview vs. Output selectable per key; numbered `Name N` sequences collapse into one cycling key. |
| **BRB** | key | Cut/queue a Be-Right-Back scene; cycles all `BRB`-prefixed scenes. |
| **Mic Gain** | encoder | Rotate to trim mic gain (0.2 dB / detent); press to reset to 0 dB. |

Live state is read from OBS over `obs-websocket` v5 and reflected on the keys in real time
(scene changes, record/mute/studio state, on-air vs. queued).

## Look

Key faces are pre-baked PNGs in a consistent design language: a **colored top accent bar** + a line
glyph, with the key label supplied by Ulanzi Studio's own title field.

- **Toggles** (Record, Mute, Studio, Take): accent bar + dark body when off; the color floods the whole
  key when on.
- **Scene** (3-tier), accent color chosen by the per-key icon (Monitor = blue, Camera = purple,
  Webcam = amber):
  - **Inactive** — accent bar, dark body.
  - **Preview** — the whole key floods desaturated **yellow** (this scene is queued).
  - **Live** — the whole key floods the accent color (this scene is on Program).
- **BRB** (3-tier, magenta): inactive · **yellow** when a BRB card is queued to Preview · **magenta**
  when a BRB card is live on Program.

Faces are generated at build time from small `currentColor` SVGs + a palette
(`scripts/gen-key-faces.mjs`, `plugin/tokens.js`).

## Hardware (Ulanzi D200X)

14 LCD keys (one double-wide) · 3 rotary encoders (rotate + press) · 2 page buttons (Studio-managed).
Built and verified for the **D200X**.

> **`Devices` gotcha:** a physical D200X reports its runtime identity as `Ulanzi Deck 5x3` /
> `20GBA9901`, **not** the catalog name `D200X`. So a manifest `"Devices": ["D200X"]` filter
> *excludes the actual hardware* and the action (typically an encoder) never becomes placeable. Use
> `"Devices": []`.

## Install

1. **Enable OBS WebSocket** — in OBS: *Tools → WebSocket Server Settings → Enable* (default port 4455).
   The plugin reads OBS's own auto-generated password from OBS's config, so you don't have to copy it —
   but you can override host/port/password in the config file below.
2. **Build** — `npm install && npm run build` (produces the bundled `dist/app.js`).
3. **Sideload** — copy the whole `com.ulanzi.ulanziobs.ulanziPlugin/` folder into
   `~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/` (macOS) and restart Ulanzi Studio.
4. **(Optional) Configure** — copy `config.example.json` to `~/.config/ulanzi-obs/config.json` to set
   `micInput`, the `brbScene` prefix, host/port, or an explicit password.

See [`SETUP.md`](SETUP.md) for details and [`PORTING.md`](PORTING.md) for the design/spec.

## Layout

```
com.ulanzi.ulanziobs.ulanziPlugin/   the plugin (sideload this whole folder)
  manifest.json                       actions + metadata
  plugin/app.js                       main-service wiring (Node)
  plugin/obs/ObsClient.js             obs-websocket v5 client
  plugin/actions/*.js                 one file per action
  plugin/tokens.js                    palette + geometry (single source of truth)
  property-inspector/                 per-action settings panes (Scene, BRB, Mute, Mic Gain)
  assets/actions/*                    icon SVGs + pre-baked key-face PNGs
  scripts/gen-key-faces.mjs           build-time face generator (rsvg-convert + ImageMagick)
PORTING.md                            the MX → D200X design spec
SETUP.md                              build / install / configure
config.example.json                   copy to ~/.config/ulanzi-obs/config.json
```

## Requirements

- **Ulanzi Studio** (the desktop host for the deck).
- **OBS Studio** 28+ (bundled obs-websocket v5).
- **Node.js** for building (Ulanzi Studio bundles its own Node to *run* the plugin).
- **rsvg-convert** + **ImageMagick** (`magick`) — only to regenerate key faces (`npm run gen:faces`).

## License

MIT. The vendored `libs/` and `plugin/actions/ulanzi-api/` are from the UlanziDeck SDK (Apache-2.0).
