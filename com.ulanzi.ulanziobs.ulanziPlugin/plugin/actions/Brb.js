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
const STATE_OFF = 0; // brb_off.png
const STATE_ON = 1;  // brb_on.png

export default class BrbAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.brbScene = null;     // PI override of the prefix; falls back to config.brbScene
    this._lastIndex = -1;     // per-instance resume index (cycle position)
    this._lastFaceIndex = -1; // memoized last painted State index (repaint-storm guard)
    this.render();
  }

  updateSettings(settings) {
    if (settings && settings.brbScene) this.brbScene = settings.brbScene;
    this.render();
  }

  _prefix() {
    return this.brbScene || this.config.brbScene || 'BRB';
  }

  run() {
    const scenes = this.obs.getScenesWithPrefix(this._prefix());
    const n = scenes.length;
    if (n === 0) return; // no BRB cards -> no-op

    const current = this.obs.currentProgramScene;
    const curIdx = current != null ? scenes.indexOf(current) : -1;
    const baseIdx = curIdx >= 0 ? curIdx : this._lastIndex;
    const nextIdx = (((baseIdx + 1) % n) + n) % n; // resume + wrap
    this._lastIndex = nextIdx;

    this.obs.setProgramScene(scenes[nextIdx]);
    this.render();
  }

  render() {
    let index = STATE_OFF;
    if (this.obs.isConnected) {
      const current = this.obs.currentProgramScene;
      if (current != null) {
        const scenes = this.obs.getScenesWithPrefix(this._prefix());
        if (scenes.indexOf(current) >= 0) index = STATE_ON;
      }
    }
    if (index === this._lastFaceIndex) return; // memoize: skip redundant repaints
    this._lastFaceIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }

  destroy() {}
}
