# PORTING.md — MX OBS plugin → Ulanzi D200X

The authoritative map from the released **MX OBS plugin** (`~/repositories/mx-obs-plugin`, C#/.NET,
Logi Actions SDK) to this **UlanziDeck plugin** (JS/Node, Apache-2.0 SDK, Ulanzi Studio). Goal: as
close to 1:1 as the platform allows, plus documented platform additions. A developer should be able to
implement each action from this file without re-reading the C#.

Status: **SCAFFOLD** — structure + this spec are done; action bodies are stubs to be filled on
hardware arrival. Every code file has a header comment pointing back here.

---

## Target hardware — Ulanzi D200X (verified against product photo + Ulanzi page)

- **14 LCD keys**, 5×3 grid, **one key is double-wide** (consumes 2 cells → 14 keys, not 15).
- **3 rotary encoders**, each **rotate + press** (SDK: `onDialRotate` + `onDialDown`/`onDialUp`).
- **2 page buttons** — Ulanzi Studio paging; **NOT plugin-addressable**. Ignore.
- **No separate auxiliary display** (the "5.5in 960×540" spec = the key panel measured diagonally).

The D200X is a *closer* analog to the MX Creative Console than the plain D200: more keys, and 3
clickable encoders vs the MX's single roller. Every MX feature maps; Mic Gain gets a real encoder.

---

## SDK mechanics (the load-bearing facts)

- **Node.js main service** (not HTML) — needed for a persistent obs-websocket client with auth. Entry
  `plugin/app.js` → webpack → `dist/app.js` (manifest `CodePath`). Node 20, ES modules.
- Plugin folder `com.ulanzi.ulanziobs.ulanziPlugin`; plugin UUID `com.ulanzi.ulanzistudio.ulanziobs`
  (**exactly 4 dot-segments** — the SDK uses segment count to distinguish main service from action);
  action UUIDs = `<pluginUUID>.<action>` (5 segments).
- `$UD` (class `UlanziApi`, from `plugin/actions/ulanzi-api/index.js`): connects to Ulanzi Studio on
  `ws://127.0.0.1:3906` (host passes `argv=[address, port, language]`).
- **Lifecycle:** `onAdd` (placed → cache a per-`context` instance) · `onSetActive` (page visible) ·
  `onRun` (**keypad press**, the main trigger) · `onDialRotate` (encoder turn; msg carries `rotateEvent`
  = `'left'|'right'|'hold-left'|'hold-right'`, a DIRECTION — no numeric magnitude) ·
  `onDialDown`/`onDialUp` (encoder press) · `onClear` (removed; `param` is an **array**, each element
  has its own `.context`) · `onParamFromApp`/`onParamFromPlugin` (settings changed).
- **Key face setters:** `setStateIcon(ctx,stateIdx,text)` (index into manifest `States[]`),
  `setBaseDataIcon(ctx,dataUri,text)` (live-rendered image), `setPathIcon(ctx,path,text)` (a file).
  Use `DisableAutomaticStates:true` on every action (we drive state from OBS, not host auto-toggle).
- **OBS: zero built-in support.** We ship our own obs-websocket v5 client (`obs-websocket-js`).
- Property Inspector = per-action HTML pane; pushes settings via `$UD.sendParamFromPlugin`.
- Shared OBS creds come from the config file (`~/.config/ulanzi-obs/config.json`); per-key overrides
  come from each action's PI. (The Node `$UD` DOES implement `get/setGlobalSettings` — verified in SDK
  source — but we use the config file so the password lives outside Ulanzi Studio's store.)

---

## The 7 actions (1:1)

Rendering model (port of `Icons.cs`) — **black-idle / color-active**: idle = black key + icon in the
function color; active = color floods the key + icon in dark ink. Palette (exact hex): cyan `#3A9BD4`
(scenes), green `#35C66B` (take/live/on), red `#E5484D` (mute/rec), amber `#E0902F` (BRB), slate
`#5A626E` (offline). SVGs use `currentColor`; recolor = string-replace → `#RRGGBB` → rasterize.
**Memoize composed tiles** (name|bg|iconColor|w) — uncached rebuilds pegged the MX host at ~375% CPU.
Deliver via `setBaseDataIcon` (lets us recolor live). Files: `plugin/render.js`, `assets/actions/*`.

**ICON SYSTEM (verified against Ulanzi's own shipping plugins + `device_type_source.json`).** Two
distinct tiers — do NOT conflate them:
- **`Icon` (action-level)** = the picker/sidebar thumbnail in Studio. SVG (or small PNG). Never on the
  deck. We keep the small `assets/actions/*.svg` here.
- **`States[].Image`** = the actual **physical LCD key face**, and the platform standard is **196×196
  PNG** (Ulanzi's OBS plugin: 44 faces at 196×196; lightmaster: 14/14 at 196×196). A bare/upscaled
  24×24 glyph looks tiny+blurry on the key — the faces must be authored/composed at 196.
- **Double-wide key** = D200X position `3_2` is a `LargeItem`+`FixedItem` (from `device_type_source.json`:
  D200X Layout = 5 cols × 3 rows, `LargeItem: 3_2`). Its face is **392×196** (two tiles). `render.js`
  exports `KEY_PX=196`, `WIDE_PX=392`, `GLYPH_PX=120`, `KEY_RADIUS_PX=27`.
- **Static faces are generated, not hand-drawn:** `npm run gen:faces` (`scripts/gen-key-faces.mjs`,
  data in `scripts/key-faces.json`) composes each `States[].Image` PNG (dark/colour rounded key +
  centered recoloured glyph) from the SVG sources + the `render.js` PALETTE, so static + live faces
  match. `npm run build` runs it first. Committed to the repo (a sideload can't run a generator).
- **Live render** uses the SAME palette + geometry at 196 (`idleGlyph`/`activeTile(name, colorHex,
  widthPx)`), delivered via `setBaseDataIcon` so scenes/state recolor without shipping every variant.

### 1. Record — `plugin/actions/Record.js` · Keypad
- press → `obs.toggleRecord()` → **`ToggleRecord`**.
- state `obs.isRecording`: prime **`GetRecordStatus`**.`outputActive`; live **`RecordStateChanged`**.`outputActive`.
- disconnected → idle('record', slate) · recording → active('record', red) · idle → idle('record', red).

### 2. Mute — `plugin/actions/Mute.js` · Keypad · PI: mic input override
- press → `obs.toggleInputMute(mic)` → **`ToggleInputMute`** `{inputName}`.
- mic = `settings.micInput || config.micInput` (default `"Scarlett Solo"`).
- state `obs.getInputMuted(mic)`; live **`InputMuteStateChanged`**.
- **PRIME-ONCE:** first render, if `!obs.hasMuteState(mic)` → `obs.refreshInputMuteAsync(mic)`
  (**`GetInputMute`**). Do NOT re-poll every stateChanged — that was the CPU feedback loop.
- disconnected → idle('mic', slate) · muted → active('mic-muted', red) · live → idle('mic', red).

### 3. Studio — `plugin/actions/Studio.js` · Keypad
- press → `obs.setStudioModeEnabled(!obs.studioModeEnabled)` → **`SetStudioModeEnabled`** `{studioModeEnabled}`.
- state `obs.studioModeEnabled`: prime **`GetStudioModeEnabled`**; live **`StudioModeStateChanged`**.
- disconnected → idle('studio', slate) · on → active('studio', green) · off → idle('studio', green).

### 4. Take — `plugin/actions/Take.js` · Keypad · momentary green flash
- press → `obs.triggerStudioModeTransition()` → **`TriggerStudioModeTransition`** (Preview→Program).
- flash: on press, `_flashUntil = now + 450ms`, repaint now, `setTimeout(repaint, 450)`.
- disconnected → idle('transition', slate) · flashing (<450ms) → active('transition', green) ·
  rest → idle('transition', green). Stateless otherwise.

### 5. BRB — `plugin/actions/Brb.js` · Keypad · prefix-cycle (double-wide-key candidate)
- press: `prefix = config.brbScene` (default `"BRB"`); `scenes = obs.getScenesWithPrefix(prefix)`
  (case-insensitive, sorted; `[]` → no-op). Resume+wrap:
  ```
  baseIdx = indexOf(currentProgramScene) >= 0 ? that : _lastIndex   // _lastIndex starts -1
  nextIdx = ((baseIdx + 1) % n + n) % n
  _lastIndex = nextIdx
  obs.setProgramScene(scenes[nextIdx])   // SetCurrentProgramScene — ALWAYS a hard cut, NOT mode-aware
  ```
- disconnected → idle('brb', slate) · on a BRB card (current startsWith prefix) → active('brb', amber)
  · idle → idle('brb', amber). New "BRB N" scenes join live via `SceneListChanged`.

### 6. Scene — `plugin/actions/Scene.js` · Keypad · PI: target + color
**The one real divergence.** MX added N dynamic parameters to ONE command (N scene keys auto-appeared).
UlanziDeck has no dynamic-parameter analog — the user places a key and configures it.
- **Scene publishing — decide at code-time:**
  - **Option A (default, in the stub):** ONE placeable "Scene" action; each key's PI picks a
    `target` = a scene name OR `"seq:<base>"`, plus an idle color. The PI dropdown is fed the live
    scene list, which the main service relays via `$UD.sendToPropertyInspector({scenes:[...]})`.
  - **Option B:** a generator emitting one Ulanzi profile per discovered scene.
- **Sequence collapse** (`SEQ_RE = /^(?<base>.+?)\s+(?<num>\d+)$/`): "Cam 1","Cam 2" → base "Cam";
  a base needs **≥2 members** or it's a standalone scene. Exclude scenes startsWith `config.brbScene`.
- press → resolve target:
  - standalone → the name.
  - `seq:<base>` → advance+wrap over members relative to the **mode-appropriate active** scene
    (Preview in Studio Mode else Program); per-base resume index.
  - then **mode-aware cut:** `obs.studioModeEnabled ? obs.setPreviewScene(t) : obs.setProgramScene(t)`
    → **`SetCurrentPreviewScene`** / **`SetCurrentProgramScene`**.
- idle color = `colorByName(settings.color || config.sceneColors[name], cyan)`.
- **glyph** = `settings.icon || config.sceneIcons[name] || 'scenes'` — per-scene icon override so a
  camera scene reads as a camera, not the default monitor. Icon names map to `assets/actions/<name>.svg`
  (`camera`, `webcam`, `monitor`, default `scenes`). is-Program → active(icon, green); is-Preview →
  active(icon, cyan); else idle(icon, idleColor). A seq key lights if ANY member is Program/Preview.
  (Ported from the MX fix: `SceneCommand` hardcoded `"scenes"` for every scene; now data-driven off
  `sceneIcons`, e.g. `{"D850":"camera","Brio":"webcam"}`.)

### 7. Mic Gain — `plugin/actions/MicGain.js` · **Encoder** · PI: mic input override
- rotate: use `onDialRotateLeft`/`onDialRotateRight` (the msg gives DIRECTION only — `rotateEvent`,
  no numeric delta). Each event steps a fixed amount: `next = clamp(current ± STEP_DB, -60, 0)`
  (− on left, + on right); `obs.setInputVolumeDb(mic, next)` → **`SetInputVolume`** `{inputName, inputVolumeDb}`.
- press (`onDialDown`) → `obs.setInputVolumeDb(mic, 0)` (reset to unity).
- readout `"-6.0 dB"` (one decimal) / `"—"` disconnected / `"…"` unknown — via the encoder `$UA1`
  layout title.
- prime **`GetInputVolume`** when NaN; live **`InputVolumeChanged`**.
- **`STEP_DB = 0.04`** — user-tuned to "Perfect" on the MX. **DO NOT change without asking.**
  ⚠️ Feel WILL differ from the MX: the MX roller streamed a signed magnitude (roll faster → bigger
  jump); the **D200X encoder reports only direction, one `dialrotate` event per detent** (SDK gives no
  magnitude — verified). So gain moves a FIXED `STEP_DB` per detent, not a speed-scaled amount. 0.04/detent
  will likely feel too fine (a detent is a bigger physical unit than a roller tick) — re-tune the
  per-detent step on hardware, keeping 0.04 as the documented starting point. This is the single most
  likely feel-difference from the MX. **[verify on hardware: does one detent = exactly one event, and
  is there any count/velocity field beyond `rotateEvent`?]**

---

## obs-websocket v5 — exact protocol (all confirmed from MX source)

**Requests:** `ToggleRecord` · `ToggleInputMute`{inputName} · `SetStudioModeEnabled`{studioModeEnabled}
· `TriggerStudioModeTransition` · `SetCurrentPreviewScene`{sceneName} · `SetCurrentProgramScene`{sceneName}
· `SetInputVolume`{inputName, inputVolumeDb} · `GetSceneList` · `GetRecordStatus` · `GetStudioModeEnabled`
· `GetInputMute`{inputName} · `GetInputVolume`{inputName}.
> Note: scene requests are `SetCurrentPreviewScene`/`SetCurrentProgramScene` (v5), not the short forms.
> "Take" is *only* `TriggerStudioModeTransition`. Volume is all in **dB** (`inputVolumeDb`), never mul.

**Event subscription mask** `1|4|8|64|1024` = General|Scenes|Inputs|Outputs|Ui (`EVENT_SUB_MASK` in
`ObsClient.js`). **Events handled:** `RecordStateChanged` · `InputMuteStateChanged` · `InputVolumeChanged`
· `CurrentProgramSceneChanged` · `CurrentPreviewSceneChanged` · `StudioModeStateChanged` ·
`SceneListChanged`/`SceneCreated`/`SceneRemoved`/`SceneNameChanged` (→ refresh scene list).

**Connect/auth:** `obs-websocket-js` handles the Hello/Identify/SHA256 handshake. Reconnect forever
(3s retry). Prime on connect: `GetRecordStatus`, `GetStudioModeEnabled`, `GetSceneList`, then one
stateChanged. Mute/volume are primed lazily by their consumers (not on connect).

## CPU / feedback-loop (MUST replicate — this was ~375% CPU on the MX)
Three change-gates in `ObsClient`:
1. connection: only emit when `isConnected` flips.
2. mute refresh: only emit when the mute value actually changed.
3. volume refresh: only emit when `|prev - db| > 0.01` (dB epsilon).
Plus caller-side: Mute primes only when `!hasMuteState`; Mic Gain refreshes only when volume is NaN;
`setInputVolumeDb` optimistically caches locally before sending so the dial steps smoothly.
And render-side: memoize composed key tiles. Every OBS event repaints all keys — without these gates
and caches you recreate the GC-thrash storm.

---

## Config — `~/.config/ulanzi-obs/config.json` (mirrors MX)
`{ host, port, password, micInput, brbScene, sceneColors: { "<name|base>": "<palette>" },
sceneIcons: { "<name|base>": "<icon>" } }`.
All optional; missing file → defaults (127.0.0.1:4455, mic "Scarlett Solo", brb prefix "BRB").
Real `config.json` is git-ignored (holds the OBS password). See `config.example.json`. `brbScene` is a
PREFIX; `sceneColors` values are palette names (cyan|green|red|amber|slate|white); `sceneIcons` values are
icon names (`camera`|`webcam`|`monitor`|`scenes`), unlisted scenes default to `scenes`. Loader: `plugin/config.js`.

---

## Platform additions (documented, NOT built in v0.1)

- **2 spare encoders** — knob 1 = Mic Gain; knobs 2 & 3 unassigned (user's call, decide on hardware).
  Candidates: 2nd audio-input gain (desktop/game), transition-duration scrub, preview-scene scrub
  (rotate = next/prev Preview, press = Take). (On the MX the user reserved the single dial and vetoed
  dial-scene-nav; with 3 knobs here that veto may not carry — ask before building.)
- **Double-wide key** — natural home for a width-benefiting action (a scene name label, or BRB).
  Needs a non-square tile aspect in `render.js`; confirm the exact pixel aspect on device.
- **No aux-display dashboard** — hardware has no separate screen. N/A.

## Open items to resolve ON HARDWARE ARRIVAL
1. **macOS plugins install path** — SDK documents only a Windows path. Verify against a real Ulanzi
   Studio install (likely `~/Library/Application Support/Ulanzi/UlanziStudio/plugins/`, UNCONFIRMED).
2. **Encoder delta semantics + Mic Gain re-tune** — measure what `onDialRotate` delta a detent sends;
   re-tune effective step (baseline STEP_DB 0.04).
3. **Double-wide key** manifest/render specifics.
4. **Scene publishing** — finalize Option A vs B once the placement UX is visible.
5. **obs-websocket-js version** — pinned `^5.0.6` in package.json; confirm API on first real connect.
