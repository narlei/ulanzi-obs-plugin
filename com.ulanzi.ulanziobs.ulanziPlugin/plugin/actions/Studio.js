// Studio key — port of StudioModeCommand.cs.
//
// press (run):  obs.setStudioModeEnabled(!obs.studioModeEnabled)
//                                               -> SetStudioModeEnabled { studioModeEnabled }
// state source: obs.studioModeEnabled           (prime GetStudioModeEnabled,
//                                                live via StudioModeStateChanged)
// visuals:      disconnected -> idleGlyph('studio', slate)
//               enabled      -> activeTile('studio', green)
//               disabled     -> idleGlyph('studio', green)
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

export default class StudioAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
  }

  run() {
    // this.obs.setStudioModeEnabled(!this.obs.studioModeEnabled);
  }

  render() {}

  destroy() {}
}
