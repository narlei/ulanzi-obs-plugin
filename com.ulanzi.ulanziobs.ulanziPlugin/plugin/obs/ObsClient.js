// OBS WebSocket v5 client — port of ObsWebSocketClient.cs.
//
// SCAFFOLD STUB. Shape and public surface are in place; the connection logic and
// event/request plumbing are TODO (implemented on hardware arrival). Uses
// obs-websocket-js (v5) which handles the opcode/auth handshake for us.
//
// State this must own + expose (consumed by the action render() methods):
//   IsConnected, IsRecording, StudioModeEnabled,
//   CurrentProgramScene, CurrentPreviewScene,
//   mutedByInput{}, volumeDbByInput{},  scene list (+ prefix filter).
//
// CRITICAL — replicate the MX change-gates to avoid the ~375% CPU feedback loop:
//   * only emit 'stateChanged' when a value ACTUALLY changes (delta gate)
//   * mute/volume are primed ONCE (lazily), not re-polled on every stateChanged
//   * volume delta epsilon = 0.01 dB
//   (See PORTING.md "CPU / feedback-loop" section for the exact rules.)

import { EventEmitter } from 'events';
// import OBSWebSocket from 'obs-websocket-js';  // enable when implementing

// obs-websocket v5 event subscription mask used by the MX plugin:
//   General(1) | Scenes(4) | Inputs(8) | Outputs(64) | Ui(1024)
export const EVENT_SUB_MASK = 1 | 4 | 8 | 64 | 1024;

export class ObsClient extends EventEmitter {
  constructor(config) {
    super();
    this._cfg = config;

    // --- live state (mirrors the C# fields) ---
    this.isConnected = false;
    this.isRecording = false;
    this.studioModeEnabled = false;
    this.currentProgramScene = null;
    this.currentPreviewScene = null;

    this._sceneNames = [];              // ordered as OBS returns them (GetSceneList)
    this._mutedByInput = {};            // inputName -> bool
    this._volumeDbByInput = {};         // inputName -> number (dB)

    // this._obs = new OBSWebSocket();
  }

  // --- lifecycle ---
  start() {
    // TODO: connect to ws://host:port with password + EVENT_SUB_MASK, reconnect forever
    // on drop (3s retry), prime initial state, then wire event handlers.
    // See PORTING.md for the exact request list and event list.
  }

  stop() {
    // TODO: disconnect + stop reconnect loop.
  }

  // --- requests (exact obs-websocket v5 requestType in the comment) ---
  toggleRecord() {}                         // ToggleRecord
  toggleInputMute(inputName) {}             // ToggleInputMute { inputName }
  setStudioModeEnabled(enabled) {}          // SetStudioModeEnabled { studioModeEnabled }
  triggerStudioModeTransition() {}          // TriggerStudioModeTransition
  setPreviewScene(sceneName) {}             // SetCurrentPreviewScene { sceneName }
  setProgramScene(sceneName) {}             // SetCurrentProgramScene { sceneName }
  setInputVolumeDb(inputName, db) {}        // SetInputVolume { inputName, inputVolumeDb }

  // --- scene helpers (port of GetAllScenes / GetScenesWithPrefix) ---
  getAllScenes() {
    return [...this._sceneNames];
  }

  getScenesWithPrefix(prefix) {
    const p = (prefix || '').toLowerCase();
    return this._sceneNames
      .filter((n) => n.toLowerCase().startsWith(p))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  // --- lazy-primed getters used by Mute key / Mic Gain encoder ---
  hasMuteState(inputName) {
    return Object.prototype.hasOwnProperty.call(this._mutedByInput, inputName);
  }
  getInputMuted(inputName) {
    return !!this._mutedByInput[inputName];
  }
  getInputVolumeDb(inputName) {
    const v = this._volumeDbByInput[inputName];
    return v === undefined ? NaN : v;
  }
  refreshInputMuteAsync(inputName) {}       // GetInputMute -> change-gated set
  refreshInputVolumeAsync(inputName) {}     // GetInputVolume -> change-gated set

  // --- internal: only fire when something actually changed ---
  _raiseStateChanged() {
    this.emit('stateChanged');
  }
}
