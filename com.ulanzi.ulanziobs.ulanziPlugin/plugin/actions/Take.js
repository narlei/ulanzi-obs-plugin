// Take key — port of TransitionCommand.cs (momentary, green flash on press).
//
// press (run):  obs.triggerStudioModeTransition()  -> TriggerStudioModeTransition
// flash:        on press, paint take_on.png immediately, then schedule a one-shot
//               timer at +FLASH_MS to revert to take_off.png (the rest face).
// visuals:      faces are PRE-BAKED PNGs painted via ud.setPathIcon.
//               rest / disconnected -> /assets/actions/take_off.png
//               flashing (< FLASH_MS since press) -> /assets/actions/take_on.png
// Stateless otherwise (no OBS state drives its color; Take only ever flashes green).
//
// The last-painted path is MEMOIZED per context so repeated stateChanged repaints
// don't storm the host with redundant setPathIcon calls (see PORTING.md CPU note).

const FLASH_MS = 180;

const FACE_OFF = '/assets/actions/take_off.png';
const FACE_ON = '/assets/actions/take_on.png';

export default class TakeAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._flashTimer = null;
    this._lastPath = null; // memo: last path painted for this.ctx
    this.render();
  }

  run() {
    this.obs.triggerStudioModeTransition();
    // momentary flash: paint the "on" face now, revert after FLASH_MS.
    this._paint(FACE_ON);
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flashTimer = null;
      this.render();
    }, FLASH_MS);
  }

  render() {
    // Take carries no persistent OBS state — rest and disconnected both show OFF.
    this._paint(FACE_OFF);
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
  _paint(path) {
    if (this._lastPath === path) return;
    this._lastPath = path;
    this.ud.setPathIcon(this.ctx, path);
  }
}
