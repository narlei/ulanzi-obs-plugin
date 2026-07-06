// BRB key — port of BrbCommand.cs (prefix-based scene cycling).
//
// press (run):
//   prefix  = settings.brbScene || config.brbScene || "BRB"
//   scenes  = obs.getScenesWithPrefix(prefix)   (case-insensitive, sorted; [] -> no-op)
//   current = obs.currentProgramScene
//   baseIdx = indexOf(current) >= 0 ? that : this._lastIndex   (_lastIndex starts -1)
//   nextIdx = ((baseIdx + 1) % n + n) % n        (resume + wrap)
//   this._lastIndex = nextIdx
//   obs.setProgramScene(scenes[nextIdx])         -> SetCurrentProgramScene (always a hard cut,
//                                                   NOT mode-aware, even in Studio Mode)
// visuals (PRE-BAKED faces, painted via ud.setStateIcon (State index); memoized per context):
//   disconnected            -> '/assets/actions/brb_off.png'  (OFF/idle face)
//   on a BRB card (Program scene is one of the cards) -> '/assets/actions/brb_on.png'
//   idle                    -> '/assets/actions/brb_off.png'
// Auto-discovery: new "BRB N" scenes join the cycle live (SceneListChanged refresh).

// Manifest State indices (setStateIcon flips these by index; no path resolution).
// 3-tier like Scene: inactive / preview (yellow) / live (magenta flood).
const STATE_INACTIVE = 0; // brb_inactive.png
const STATE_PREVIEW = 1;  // brb_preview.png (whole-key yellow)
const STATE_LIVE = 2;     // brb_live.png (whole-key magenta)

export default class BrbAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.brbScene = null;     // PI override of the prefix; falls back to config.brbScene
    this.target = null;       // 'preview' | 'output' — from PI; default follows studio mode
    this._lastIndex = -1;     // per-instance resume index (cycle position)
    this._lastFaceIndex = -1; // memoized last painted State index (repaint-storm guard)
    this.render();
  }

  updateSettings(settings) {
    if (settings && settings.brbScene) this.brbScene = settings.brbScene;
    if (settings && settings.target !== undefined) this.target = settings.target;
    this.render();
  }

  _prefix() {
    return this.brbScene || this.config.brbScene || 'BRB';
  }

  // Route to Preview (queue) rather than Program (cut). Default: follow studio mode.
  _routesToPreview() {
    if (this.target === 'preview') return true;
    if (this.target === 'output') return false;
    return !!this.obs.studioModeEnabled;
  }

  run() {
    const scenes = this.obs.getScenesWithPrefix(this._prefix());
    const n = scenes.length;
    if (n === 0) return; // no BRB cards -> no-op

    // Advance relative to the mode-appropriate active scene (Preview when routing
    // to preview, else Program), resuming from our own index otherwise.
    const active = this._routesToPreview()
      ? this.obs.currentPreviewScene
      : this.obs.currentProgramScene;
    const curIdx = active != null ? scenes.indexOf(active) : -1;
    const baseIdx = curIdx >= 0 ? curIdx : this._lastIndex;
    const nextIdx = (((baseIdx + 1) % n) + n) % n; // resume + wrap
    this._lastIndex = nextIdx;

    if (this._routesToPreview()) {
      this.obs.setPreviewScene(scenes[nextIdx]);
    } else {
      this.obs.setProgramScene(scenes[nextIdx]);
    }
    this.render();
  }

  render() {
    // 3-tier, mirroring Scene: a BRB card on Program -> LIVE (magenta flood);
    // on Preview (queued, not yet taken) -> PREVIEW (yellow); neither -> inactive.
    // Program wins over Preview when a BRB card is on both.
    let index = STATE_INACTIVE;
    if (this.obs.isConnected) {
      const scenes = this.obs.getScenesWithPrefix(this._prefix());
      const onBus = (name) => name != null && scenes.indexOf(name) >= 0;
      if (onBus(this.obs.currentProgramScene)) {
        index = STATE_LIVE;
      } else if (onBus(this.obs.currentPreviewScene)) {
        index = STATE_PREVIEW;
      }
    }
    if (index === this._lastFaceIndex) return; // memoize: skip redundant repaints
    this._lastFaceIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }

  destroy() {}
}
