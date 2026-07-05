// Take key — port of TransitionCommand.cs (momentary, green flash on press).
//
// press (run):  obs.triggerStudioModeTransition()  -> TriggerStudioModeTransition
// flash:        on press, mark _flashUntil = now + 450ms, repaint immediately,
//               schedule a one-shot timer at +450ms to repaint back to rest.
// visuals:      disconnected -> idleGlyph('transition', slate)
//               flashing     -> activeTile('transition', green)   (< 450ms since press)
//               rest         -> idleGlyph('transition', green)
// Stateless otherwise (no OBS state drives its color besides connection).
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

const FLASH_MS = 450;

export default class TakeAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._flashUntil = 0;
    this._flashTimer = null;
  }

  run() {
    // this.obs.triggerStudioModeTransition();
    // this._flashUntil = Date.now() + FLASH_MS;
    // this.render();
    // clearTimeout(this._flashTimer);
    // this._flashTimer = setTimeout(() => this.render(), FLASH_MS);
  }

  render() {
    // const flashing = Date.now() < this._flashUntil;
  }

  destroy() {
    // clearTimeout(this._flashTimer);
  }
}
