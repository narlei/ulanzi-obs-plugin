// Mic Gain encoder — port of MicGainAdjustment.cs.
//
// rotate (onDialRotate): the SDK message gives DIRECTION only —
//   jsn.rotateEvent = 'left' | 'right' | 'hold-left' | 'hold-right'. There is NO numeric
//   delta/magnitude (verified in SDK source). So each event steps a FIXED amount:
//     current = obs.getInputVolumeDb(mic); if NaN -> 0
//     dir     = (rotateEvent starts 'right') ? +1 : -1
//     next    = clamp(current + dir * STEP_DB, MIN_DB, MAX_DB)
//     obs.setInputVolumeDb(mic, next)        -> SetInputVolume { inputName, inputVolumeDb }
// press (dialDown): obs.setInputVolumeDb(mic, 0)   (reset to unity / 0 dB)
// readout: "-6.0 dB" (one decimal); "—" disconnected; "…" unknown.
//          shown via the encoder $UA1 layout title (setStateIcon/text or setFeedback).
// mic input: settings.micInput || config.micInput.
// PRIME: on load if connected -> obs.refreshInputVolumeAsync(mic);
//        refresh only when getInputVolumeDb is NaN (gated).
//
// STEP_DB = 0.04 — user-tuned to "Perfect" on the MX roller. DO NOT change without asking.
// NOTE: feel WILL differ. MX roller streamed a signed magnitude (roll faster -> bigger jump);
//   the D200X encoder reports only direction, one event per detent. So gain moves a fixed
//   STEP_DB per detent, not speed-scaled. 0.04/detent will likely be too fine (a detent is a
//   bigger unit than a roller tick) — re-tune the per-detent step on hardware, keeping 0.04 as
//   the documented starting point. [verify on hardware: 1 detent == 1 event? any count field?]
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
    // const dir = (jsn.rotateEvent || '').startsWith('right') ? 1 : -1;  // direction only
    // clamp(current + dir * STEP_DB, MIN_DB, MAX_DB) -> obs.setInputVolumeDb(mic, next)
  }

  dialDown() {
    // this.obs.setInputVolumeDb(this.micInput, 0.0);  // reset to unity
  }

  render() {
    // update encoder readout: `${db.toFixed(1)} dB` / "—" / "…"
  }

  destroy() {}
}
