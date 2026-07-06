// Mute key — port of MuteCommand.cs.
//
// press (run):  obs.toggleInputMute(mic)      -> ToggleInputMute { inputName }
// mic input:    settings.micInput || config.micInput  (default "Scarlett Solo")
// state source: obs.getInputMuted(mic)         (live via InputMuteStateChanged)
// PRIME-ONCE:   on first render, if connected && !obs.hasMuteState(mic) ->
//               obs.refreshInputMuteAsync(mic). That refresh raises 'stateChanged',
//               which re-runs render() with the primed value. Do NOT re-poll every
//               stateChanged (that was the CPU feedback loop).
// visuals (PRE-BAKED faces, painted via setStateIcon (State index); user owns the Studio label):
//               muted         -> '/assets/actions/mute_on.png'
//               live / offline-> '/assets/actions/mute_off.png'
//   (disconnected shows the OFF face — obs.getInputMuted returns false when state
//    is wiped on disconnect, so the default branch already yields mute_off.)
//
// PI (property-inspector/mute): lets the user override the mic input name per key.
//
// Repaint gate: memoize the last State index pushed and skip setStateIcon
// when it is unchanged (app.js repaints every live key on each 'stateChanged').

// Manifest State indices (setStateIcon flips these by index; no path resolution).
const STATE_OFF = 0;   // mute_off.png (live)
const STATE_MUTED = 1; // mute_on.png

export default class MuteAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this.micInput = config.micInput;
    this._lastIndex = -1; // last State index pushed for this key (repaint gate)
    this.render();
  }

  updateSettings(settings) {
    if (settings.micInput) this.micInput = settings.micInput;
    this.render();
  }

  run() {
    this.obs.toggleInputMute(this.micInput);
  }

  render() {
    // PRIME-ONCE: pull the current mute state the first time we can. The refresh
    // raises 'stateChanged' -> render() runs again with the real value.
    if (this.obs.isConnected && !this.obs.hasMuteState(this.micInput)) {
      this.obs.refreshInputMuteAsync(this.micInput);
    }

    // Disconnected -> OFF face (state is wiped on disconnect, so getInputMuted
    // is false and this yields mute_off; no crash).
    const index = this.obs.getInputMuted(this.micInput) ? STATE_MUTED : STATE_OFF;
    this._paint(index);
  }

  _paint(index) {
    if (index === this._lastIndex) return; // no change -> skip (prevents repaint storm)
    this._lastIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }

  destroy() {}
}
