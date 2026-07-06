// Mic Gain encoder — port of MicGainAdjustment.cs.
//
// RENDER MODEL: faces are PRE-BAKED PNGs. This encoder has a SINGLE face
// (assets/actions/micgain.png). Paint it via ud.setPathIcon(ctx, path) — the
// path is plugin-root-relative with a leading slash. No text arg: the user owns
// the Studio title/label (dB readout is not baked into the key here). The last
// painted path is memoized per instance so repeated stateChanged events don't
// re-emit an identical setPathIcon (guards against the repaint-storm the
// ObsClient change-gates warn about).
//
// rotate (onDialRotate): the SDK message gives DIRECTION only —
//   jsn.rotateEvent = 'left' | 'right' | 'hold-left' | 'hold-right'. There is NO
//   numeric delta/magnitude, so each event steps a FIXED amount:
//     current = obs.getInputVolumeDb(mic); if NaN -> 0
//     dir     = rotateEvent starts 'right' ? +1 : -1
//     next    = clamp(current + dir * STEP_DB, MIN_DB, MAX_DB)
//     obs.setInputVolumeDb(mic, next)        -> SetInputVolume { inputName, inputVolumeDb }
//   (hold-left/hold-right start 'left'/'right' so .startsWith picks up both.)
// press (dialDown): obs.setInputVolumeDb(mic, 0)   (reset to unity / 0 dB)
// mic input: settings.micInput || config.micInput.
// PRIME-ONCE: on render, if connected and getInputVolumeDb is NaN ->
//   obs.refreshInputVolumeAsync(mic). Gated on NaN so it isn't re-polled every
//   stateChanged (that was the CPU feedback loop).

const STEP_DB = 1.0;
const MIN_DB = -60.0;
const MAX_DB = 0.0;

const FACE = '/assets/actions/micgain.png';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export default class MicGainAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.micInput = config.micInput;
    this._lastPath = null; // memoized last painted face path
    this.render();
  }

  updateSettings(settings) {
    if (settings.micInput) this.micInput = settings.micInput;
    this.render();
  }

  rotate(jsn) {
    if (!this.obs.isConnected || !this.micInput) return;
    const dir = (jsn?.rotateEvent || '').startsWith('right') ? 1 : -1;
    const current = this.obs.getInputVolumeDb(this.micInput);
    const base = Number.isNaN(current) ? 0 : current;
    const next = clamp(base + dir * STEP_DB, MIN_DB, MAX_DB);
    this.obs.setInputVolumeDb(this.micInput, next);
  }

  dialDown() {
    if (!this.obs.isConnected || !this.micInput) return;
    this.obs.setInputVolumeDb(this.micInput, 0.0); // reset to unity / 0 dB
  }

  render() {
    // prime volume once when unknown so the first rotate reads a real value.
    if (this.obs.isConnected && this.micInput &&
        Number.isNaN(this.obs.getInputVolumeDb(this.micInput))) {
      this.obs.refreshInputVolumeAsync(this.micInput);
    }
    // single pre-baked face; paint only when it changes (memoized).
    this._paint(FACE);
  }

  _paint(path) {
    if (path === this._lastPath) return;
    this._lastPath = path;
    this.ud.setPathIcon(this.ctx, path);
  }

  destroy() {}
}
