// Record key — port of RecordCommand.cs.
//
// press (run):  obs.toggleRecord()            -> ToggleRecord
// state source: obs.isRecording               (primed GetRecordStatus.outputActive,
//                                               live via RecordStateChanged.outputActive)
// visuals (PRE-BAKED faces — paint via setPathIcon, plugin-root-relative /path):
//   recording (connected + isRecording) -> '/assets/actions/record_on.png'
//   idle OR disconnected                 -> '/assets/actions/record_off.png'
// Disconnected paints the OFF/idle face (never crash). No text arg: the Studio
// title/label is user-owned. Last painted path is memoized per context so we skip
// redundant setPathIcon calls (avoids the repaint-storm the PORTING notes warn about).

const FACE_ON = '/assets/actions/record_on.png';
const FACE_OFF = '/assets/actions/record_off.png';

export default class RecordAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
    this._lastPath = null; // memoized last painted face for this context
    this.render();
  }

  run() {
    this.obs.toggleRecord();
  }

  render() {
    const path = (this.obs.isConnected && this.obs.isRecording) ? FACE_ON : FACE_OFF;
    if (path === this._lastPath) return; // change-gate: skip redundant repaint
    this._lastPath = path;
    this.ud.setPathIcon(this.ctx, path);
  }

  destroy() {}
}
