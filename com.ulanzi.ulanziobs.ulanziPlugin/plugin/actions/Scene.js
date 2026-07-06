// Scene key — port of SceneCommand.cs (auto-discovery + sequence collapse + mode-aware).
//
// PUBLISHING MODEL NOTE (the one real divergence from MX):
//   MX added N dynamic parameters to ONE command (the user saw N scene keys auto-generated).
//   UlanziDeck has no dynamic-parameter analog — an action is placed per key by the user.
//   PORT DECISION: Option A — ONE placeable "Scene" action; each placed key is configured via
//   its Property Inspector: settings.scene = a scene name OR "seq:<base>" sequence,
//   settings.target = 'preview'|'output' (default follows studio mode),
//   settings.icon = 'monitor'|'camera'|'webcam' (default 'monitor').
//
// RENDER MODEL: faces are PRE-BAKED PNGs at /assets/actions/scene_<family>_<state>.png
//   family = settings.icon || 'monitor'   (monitor|camera|webcam)
//   state  = 'live' (this key's scene is current PROGRAM)
//          | 'preview' (this key's scene is current PREVIEW)
//          | 'inactive' (neither, also the disconnected / no-target face)
//   A seq key lights if ANY member matches. Painted via setPathIcon; last path memoized
//   per context so an unchanged repaint is skipped (prevents the MX repaint-storm).

export const SEQ_RE = /^(?<base>.+?)\s+(?<num>\d+)$/;
export const SEQ_PREFIX = 'seq:';

const VALID_ICONS = new Set(['monitor', 'camera', 'webcam']);

export default class SceneAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.scene = null;    // scene name or "seq:<base>", from PI settings
    this.target = null;   // 'preview' | 'output' — override for the mode-aware cut
    this.icon = null;     // family override from PI (monitor|camera|webcam)
    this._seqIndex = -1;  // per-key resume index for sequence targets
    this._lastPath = null; // memoized last painted path (skip identical repaints)
    this.render();
  }

  updateSettings(settings) {
    if (settings.scene !== undefined) this.scene = settings.scene;
    if (settings.target !== undefined) this.target = settings.target;
    if (settings.icon !== undefined) this.icon = settings.icon;
    this.render();
  }

  // --- helpers ---

  _family() {
    return VALID_ICONS.has(this.icon) ? this.icon : 'monitor';
  }

  // Members of a sequence base, in OBS UI order, matching "<base> <num>".
  _seqMembers(base) {
    const b = (base || '').toLowerCase();
    return this.obs.getAllScenes().filter((name) => {
      const m = SEQ_RE.exec(name);
      return m && m.groups.base.toLowerCase() === b;
    });
  }

  // The scene(s) this key represents: a single-element list for a standalone scene,
  // or all members for a "seq:<base>" target.
  _memberScenes() {
    const target = this.scene;
    if (!target) return [];
    if (target.startsWith(SEQ_PREFIX)) {
      return this._seqMembers(target.slice(SEQ_PREFIX.length));
    }
    return [target];
  }

  // Whether this key routes to Preview (Studio Mode) rather than Program (output).
  _routesToPreview() {
    if (this.target === 'preview') return true;
    if (this.target === 'output') return false;
    // default: follow studio mode
    return !!this.obs.studioModeEnabled;
  }

  // Resolve the concrete scene to cut to on press.
  _resolveScene() {
    const target = this.scene;
    if (!target) return null;

    if (!target.startsWith(SEQ_PREFIX)) return target; // standalone

    const members = this._seqMembers(target.slice(SEQ_PREFIX.length));
    if (members.length === 0) return null;

    // Advance relative to the mode-appropriate active scene, resuming per-key otherwise.
    const active = this._routesToPreview()
      ? this.obs.currentPreviewScene
      : this.obs.currentProgramScene;
    const activeIdx = members.indexOf(active);
    const baseIdx = activeIdx >= 0 ? activeIdx : this._seqIndex;
    const n = members.length;
    const nextIdx = (((baseIdx + 1) % n) + n) % n; // resume + wrap
    this._seqIndex = nextIdx;
    return members[nextIdx];
  }

  // --- events ---

  run() {
    if (!this.obs.isConnected) return;
    const scene = this._resolveScene();
    if (!scene) return;
    if (this._routesToPreview()) {
      this.obs.setPreviewScene(scene);
    } else {
      this.obs.setProgramScene(scene);
    }
  }

  render() {
    const family = this._family();
    let state = 'inactive';

    if (this.obs.isConnected) {
      const members = this._memberScenes();
      if (members.length) {
        const program = this.obs.currentProgramScene;
        const preview = this.obs.currentPreviewScene;
        if (members.some((s) => s === program)) {
          state = 'live';        // PROGRAM wins over PREVIEW when both match
        } else if (members.some((s) => s === preview)) {
          state = 'preview';
        }
      }
    }
    // disconnected -> 'inactive' (the OFF/idle face); never crashes.

    const path = `/assets/actions/scene_${family}_${state}.png`;
    if (path === this._lastPath) return; // memoized: skip identical repaint
    this._lastPath = path;
    this.ud.setPathIcon(this.ctx, path);
  }

  destroy() {}
}
