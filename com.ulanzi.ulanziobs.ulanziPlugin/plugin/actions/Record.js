// Record key — port of RecordCommand.cs.
//
// press (run):  obs.toggleRecord()            -> ToggleRecord
// state source: obs.isRecording               (primed GetRecordStatus.outputActive,
//                                               live via RecordStateChanged.outputActive)
// visuals (PRE-BAKED faces — paint via setStateIcon (manifest State index)):
//   recording (connected + isRecording) -> '/assets/actions/record_on.png'
//   idle OR disconnected                 -> '/assets/actions/record_off.png'
// Disconnected paints the OFF/idle face (never crash). No text arg: the Studio
// title/label is user-owned. Last painted path is memoized per context so we skip
// redundant setStateIcon calls (avoids the repaint-storm the PORTING notes warn about).

// Manifest State indices (setStateIcon flips these by index; no path resolution).
const STATE_OFF = 0; // record_off.png
const STATE_ON = 1;  // record_on.png

export default class RecordAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._lastIndex = -1; // memoized last painted State index
    this.render();
  }

  run() {
    this.obs.toggleRecord();
  }

  render() {
    const index = (this.obs.isConnected && this.obs.isRecording) ? STATE_ON : STATE_OFF;
    if (index === this._lastIndex) return; // change-gate: skip redundant repaint
    this._lastIndex = index;
    this.ud.setStateIcon(this.ctx, index);
  }

  destroy() {}
}
