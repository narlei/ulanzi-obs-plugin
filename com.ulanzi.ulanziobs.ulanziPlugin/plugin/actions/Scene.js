// Scene key — port of SceneCommand.cs (auto-discovery + sequence collapse + mode-aware).
//
// PUBLISHING MODEL NOTE (the one real divergence from MX):
//   MX added N dynamic parameters to ONE command (the user saw N scene keys auto-generated).
//   UlanziDeck has no dynamic-parameter analog — an action is placed per key by the user.
//   PORT DECISION (finalize at code-time, see ../../PORTING.md "Scene publishing"):
//     Option A (default): ONE placeable "Scene" action; each placed key is configured via
//       its Property Inspector (target = a scene name OR a "seq:<base>" sequence, + color).
//       The PI dropdown is populated from obs.getAllScenes() (live).
//     Option B: a small generator that emits one profile per discovered scene.
//   This stub carries the per-key target in settings.target (Option A).
//
// sequence collapse (for the PI dropdown + seq targets):
//   SEQ_RE = /^(?<base>.+?)\s+(?<num>\d+)$/   — "Cam 1","Cam 2" -> base "Cam"
//   a base needs >= 2 members to be a sequence; else it's a standalone scene.
//   exclude scenes startsWith config.brbScene (owned by the BRB key).
//
// press (run), target resolves to a concrete scene:
//   standalone -> the scene name
//   seq:<base> -> advance+wrap over members relative to the mode-appropriate active
//                 scene (Preview in Studio Mode else Program); per-base resume index.
//   then MODE-AWARE cut:
//     obs.studioModeEnabled ? obs.setPreviewScene(target) : obs.setProgramScene(target)
//       -> SetCurrentPreviewScene / SetCurrentProgramScene
// visuals:
//   idle color   = colorByName(settings.color || sceneColors[name], cyan)
//   is Program   -> activeTile('scenes', green)
//   is Preview   -> activeTile('scenes', cyan)
//   else         -> idleGlyph('scenes', idleColor)
//   (a seq key lights if ANY member is Program/Preview)
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

export const SEQ_RE = /^(?<base>.+?)\s+(?<num>\d+)$/;
export const SEQ_PREFIX = 'seq:';

export default class SceneAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.target = null;   // scene name or "seq:<base>", from PI settings
    this.color = null;    // palette name override from PI
    this._seqIndex = -1;  // per-key resume index for sequence targets
  }

  updateSettings(settings) {
    if (settings.target) this.target = settings.target;
    if (settings.color) this.color = settings.color;
  }

  run() {
    // resolve target (seq advance if needed) then mode-aware cut
  }

  render() {}

  destroy() {}
}
