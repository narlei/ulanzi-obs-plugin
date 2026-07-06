// Studio key — port of StudioModeCommand.cs.
//
// press (run):  obs.setStudioModeEnabled(!obs.studioModeEnabled)
//                                               -> SetStudioModeEnabled { studioModeEnabled }
// state source: obs.studioModeEnabled           (prime GetStudioModeEnabled,
//                                                live via StudioModeStateChanged)
// visuals (pre-baked PNG faces in assets/actions/):
//   disconnected -> studio_off.png   (idle/off face; never crash when !isConnected)
//   enabled      -> studio_on.png
//   disabled     -> studio_off.png
//
// Faces are pre-baked; paint via ud.setStateIcon(ctx, index). No text arg — the user
// owns the Studio label. The last painted path is memoized per instance so a repaint
// with an unchanged face is a no-op (prevents the repaint-storm PORTING.md warns about).

// Manifest State indices (setStateIcon flips these by index; no path resolution).
const STATE_OFF = 0; // studio_off.png
const STATE_ON = 1;  // studio_on.png

export default class StudioAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._lastIndex = -1;
    this.render();
  }

  run() {
    this.obs.setStudioModeEnabled(!this.obs.studioModeEnabled);
  }

  render() {
    const index = (this.obs.isConnected && this.obs.studioModeEnabled) ? STATE_ON : STATE_OFF;
    if (index === this._lastIndex) return; // memoize: skip unchanged repaints
    this._lastIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }

  destroy() {}
}
