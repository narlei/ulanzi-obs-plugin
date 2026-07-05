# ulanzi — OBS Control for the Ulanzi D200X

A [UlanziDeck](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK) plugin (JavaScript / Node.js)
that controls **OBS Studio** from a **Ulanzi Stream Controller D200X**, with live state painted on the
keys. It is a port of the [`mx-obs-plugin`](../mx-obs-plugin) (the same functionality built for the
Logitech MX Creative Console), moved to a cheaper, more-open control surface.

> **Status: SCAFFOLD (pre-hardware).** The repo structure, manifest, build toolchain, and a complete
> porting spec are in place. The action logic is stubbed and will be implemented when the D200X
> arrives — some behavior can't be built or verified without the physical device. See
> [`PORTING.md`](PORTING.md) for the full design and [`SETUP.md`](SETUP.md) for build/install.

## What it does (target feature set — 1:1 with the MX plugin)

| Action | Key/Knob | Behavior |
|--------|----------|----------|
| **Record** | key | Toggle OBS recording; red when recording. |
| **Mute** | key | Toggle mute on the mic input; red slashed-mic when muted. |
| **Studio** | key | Toggle OBS Studio Mode; green when on. |
| **Take** | key | Transition Preview → Program; flashes green on press. |
| **BRB** | key | Cut Program to a Be-Right-Back scene; cycles all `BRB`-prefixed scenes. |
| **Scene** | key | Switch to a scene — Preview in Studio Mode, else Program; numbered `Name N` sequences collapse into one cycling key. |
| **Mic Gain** | encoder | Rotate to adjust mic gain (dB); press to reset to 0 dB. |

Key faces use a **black-idle / color-active** design (idle = black key + colored icon; active = the
color floods the key). Colors are configurable per scene.

## Hardware (Ulanzi D200X)

14 LCD keys (one double-wide) · 3 rotary encoders (rotate + press) · 2 page buttons (Studio-managed) ·
no separate display. Built and tested for the **D200X**; other Ulanzi decks are not targeted.

## Layout

```
com.ulanzi.ulanziobs.ulanziPlugin/   the plugin (sideload this whole folder)
  manifest.json                       actions + metadata
  plugin/app.js                       main-service wiring (Node)
  plugin/obs/ObsClient.js             obs-websocket v5 client
  plugin/actions/*.js                 one file per action
  plugin/render.js                    key-face rendering (recolored SVGs)
  property-inspector/                 per-action settings panes
  assets/actions/*.svg                icons
PORTING.md                            the MX → D200X design spec (the real doc)
SETUP.md                              build / install / configure
config.example.json                   copy to ~/.config/ulanzi-obs/config.json
```

## Related

- [`mx-obs-plugin`](../mx-obs-plugin) — the original (Logitech MX Creative Console).
- Why a second surface: the Logi ecosystem proved hostile to independent distribution; the D200X is
  cheaper and its SDK is open (Apache-2.0, folder-sideload).

## License

MIT. The vendored `libs/` and `plugin/actions/ulanzi-api/` are from the UlanziDeck SDK (Apache-2.0).
