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
// Faces are pre-baked; paint via ud.setPathIcon(ctx, path). No text arg — the user
// owns the Studio label. The last painted path is memoized per instance so a repaint
// with an unchanged face is a no-op (prevents the repaint-storm PORTING.md warns about).

const FACE_ON = '/assets/actions/studio_on.png';
const FACE_OFF = '/assets/actions/studio_off.png';

export default class StudioAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._lastPath = null;
    this.render();
  }

  run() {
    this.obs.setStudioModeEnabled(!this.obs.studioModeEnabled);
  }

  render() {
    const path = (this.obs.isConnected && this.obs.studioModeEnabled) ? FACE_ON : FACE_OFF;
    if (path === this._lastPath) return; // memoize: skip unchanged repaints
    this._lastPath = path;
    this.ud.setPathIcon(this.ctx, path);
  }

  destroy() {}
}
