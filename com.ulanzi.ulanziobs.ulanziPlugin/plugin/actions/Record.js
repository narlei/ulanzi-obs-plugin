// Record key — port of RecordCommand.cs.
//
// press (run):  obs.toggleRecord()            -> ToggleRecord
// state source: obs.isRecording               (prime GetRecordStatus.outputActive,
//                                               live via RecordStateChanged.outputActive)
// visuals:      disconnected -> idleGlyph('record', slate)
//               recording    -> activeTile('record', red)
//               idle         -> idleGlyph('record', red)
//
// SCAFFOLD STUB — bodies TODO on hardware. See ../../PORTING.md.

export default class RecordAction {
  constructor(context, ud, obs, config) {
    this.ctx = context;
    this.ud = ud;
    this.obs = obs;
    this.config = config;
  }

  run() {
    // this.obs.toggleRecord();
  }

  render() {
    // paint this.ctx per obs.isConnected / obs.isRecording
  }

  destroy() {}
}
