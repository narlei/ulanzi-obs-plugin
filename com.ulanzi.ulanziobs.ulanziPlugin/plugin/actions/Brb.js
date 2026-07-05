// BRB key — port of BrbCommand.cs (prefix-based scene cycling).
//
// press (run):
//   prefix  = config.brbScene (default "BRB")
//   scenes  = obs.getScenesWithPrefix(prefix)   (case-insensitive, sorted; [] -> no-op)
//   current = obs.currentProgramScene
//   baseIdx = indexOf(current) >= 0 ? that : this._lastIndex   (_lastIndex starts -1)
//   nextIdx = ((baseIdx + 1) % n + n) % n        (resume + wrap)
//   this._lastIndex = nextIdx
//   obs.setProgramScene(scenes[nextIdx])         -> SetCurrentProgramScene (always a hard cut,
//                                                   NOT mode-aware, even in Studio Mode)
// visuals:      disconnected           -> idleGlyph('brb', slate)
//               on a BRB card (current startsWith prefix) -> activeTile('brb', amber)
//               idle                   -> idleGlyph('brb', amber)
// Auto-discovery: new "BRB N" scenes join the cycle live (SceneListChanged refresh).
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

export default class BrbAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._lastIndex = -1;
  }

  run() {
    // implement resume+wrap cycle over obs.getScenesWithPrefix(config.brbScene)
  }

  render() {}

  destroy() {}
}
