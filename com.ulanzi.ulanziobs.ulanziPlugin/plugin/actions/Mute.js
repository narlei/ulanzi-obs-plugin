// Mute key — port of MuteCommand.cs.
//
// press (run):  obs.toggleInputMute(mic)      -> ToggleInputMute { inputName }
// mic input:    settings.micInput || config.micInput  (default "Scarlett Solo")
// state source: obs.getInputMuted(mic)         (live via InputMuteStateChanged)
// PRIME-ONCE:   on first render, if !obs.hasMuteState(mic) -> obs.refreshInputMuteAsync(mic).
//               Do NOT re-poll every stateChanged (that was the CPU feedback loop).
// visuals:      disconnected -> idleGlyph('mic', slate)
//               muted        -> activeTile('mic-muted', red)
//               live         -> idleGlyph('mic', red)
//
// PI (property-inspector/mute): lets the user override the mic input name per key.
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

export default class MuteAction {
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

  run() {
    // this.obs.toggleInputMute(this.micInput);
  }

  render() {
    // prime-once mute state, then paint muted/live/offline
  }

  destroy() {}
}
