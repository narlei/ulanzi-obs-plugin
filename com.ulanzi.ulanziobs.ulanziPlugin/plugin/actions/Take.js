// Take key — port of TransitionCommand.cs (momentary, green flash on press).
//
// press (run):  obs.triggerStudioModeTransition()  -> TriggerStudioModeTransition
// flash:        on press, paint take_on.png immediately, then schedule a one-shot
//               timer at +FLASH_MS to revert to take_off.png (the rest face).
// visuals:      faces are PRE-BAKED PNGs painted via ud.setStateIcon (State index).
//               rest / disconnected -> /assets/actions/take_off.png
//               flashing (< FLASH_MS since press) -> /assets/actions/take_on.png
// Stateless otherwise (no OBS state drives its color; Take only ever flashes green).
//
// The last-painted path is MEMOIZED per context so repeated stateChanged repaints
// don't storm the host with redundant setStateIcon calls (see PORTING.md CPU note).

const FLASH_MS = 180;

// Manifest State indices (setStateIcon flips these by index; no path resolution).
const STATE_OFF = 0; // take_off.png
const STATE_ON = 1;  // take_on.png

export default class TakeAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._flashTimer = null;
    this._lastIndex = -1; // memo: last State index painted for this.ctx
    this.render();
  }

  run() {
    this.obs.triggerStudioModeTransition();
    // momentary flash: paint the "on" face now, revert after FLASH_MS.
    this._paint(STATE_ON);
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flashTimer = null;
      this.render();
    }, FLASH_MS);
  }

  render() {
    // Take carries no persistent OBS state — rest and disconnected both show OFF.
    this._paint(STATE_OFF);
  }

  updateSettings() {
    // No Property Inspector for Take. Repaint defensively.
    this.render();
  }

  destroy() {
    clearTimeout(this._flashTimer);
    this._flashTimer = null;
  }

  // memoized paint — skip the host round-trip if the face is unchanged.
  _paint(index) {
    if (this._lastIndex === index) return;
    this._lastIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }
}
