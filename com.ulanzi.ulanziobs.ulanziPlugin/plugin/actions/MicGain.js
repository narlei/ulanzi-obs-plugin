// Mic Gain encoder — port of MicGainAdjustment.cs.
//
// rotate (onDialRotate, jsn carries a signed delta):
//   current = obs.getInputVolumeDb(mic); if NaN -> 0
//   next    = clamp(current + delta * STEP_DB, MIN_DB, MAX_DB)
//   obs.setInputVolumeDb(mic, next)          -> SetInputVolume { inputName, inputVolumeDb }
// press (dialDown): obs.setInputVolumeDb(mic, 0)   (reset to unity / 0 dB)
// readout: "-6.0 dB" (one decimal); "—" disconnected; "…" unknown.
//          shown via the encoder $UA1 layout title (setStateIcon/text or setFeedback).
// mic input: settings.micInput || config.micInput.
// PRIME: on load if connected -> obs.refreshInputVolumeAsync(mic);
//        refresh only when getInputVolumeDb is NaN (gated).
//
// STEP_DB = 0.04 — user-tuned to "Perfect" on the MX roller. DO NOT change without asking.
// NOTE: the D200X encoder is a detented clicky knob; the MX roller was smooth-streaming.
//   The delta granularity WILL differ — re-tune the effective sensitivity on hardware,
//   but keep 0.04 as the documented baseline (see ../../PORTING.md "encoder tuning").
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

const STEP_DB = 0.04;
const MIN_DB = -60.0;
const MAX_DB = 0.0;

export default class MicGainAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.micInput = config.micInput;
  }

  updateSettings(settings) {
    if (settings.micInput) this.micInput = settings.micInput;
  }

  rotate(jsn) {
    // const delta = signed rotation from jsn
    // clamp(current + delta * STEP_DB, MIN_DB, MAX_DB) -> obs.setInputVolumeDb(mic, next)
  }

  dialDown() {
    // this.obs.setInputVolumeDb(this.micInput, 0.0);  // reset to unity
  }

  render() {
    // update encoder readout: `${db.toFixed(1)} dB` / "—" / "…"
  }

  destroy() {}
}
