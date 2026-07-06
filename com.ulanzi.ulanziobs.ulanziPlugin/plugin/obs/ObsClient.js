// OBS WebSocket v5 client — port of ObsWebSocketClient.cs.
//
// Uses obs-websocket-js (v5), which handles the Hello/Identify/SHA256 handshake.
// Owns all OBS-derived state the action render() methods consume, and raises a
// single 'stateChanged' event whenever something the keys care about changes.
//
// CRITICAL — the MX plugin pegged its host at ~375% CPU via a repaint feedback
// loop. Three change-gates prevent it here (see PORTING.md "CPU / feedback-loop"):
//   1. connection: only emit when isConnected flips.
//   2. mute refresh: only emit when the mute value actually changed.
//   3. volume refresh: only emit when |prev - db| > 0.01 dB (epsilon).
// Plus: mute/volume are primed ONCE (lazily by their consumers), not re-polled on
// every event; setInputVolumeDb caches optimistically so the dial steps smoothly.

import { EventEmitter } from 'events';
import OBSWebSocket, { EventSubscription } from 'obs-websocket-js';

// obs-websocket v5 event subscription mask used by the MX plugin:
//   General(1) | Scenes(4) | Inputs(8) | Outputs(64) | Ui(1024)
export const EVENT_SUB_MASK = 1 | 4 | 8 | 64 | 1024;

const RECONNECT_MS = 3000;
const VOLUME_EPSILON_DB = 0.01;

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

    this._obs = new OBSWebSocket();
    this._reconnectTimer = null;
    this._stopped = false;
    this._inFlightMuteRefresh = {};     // inputName -> bool (dedupe concurrent GetInputMute)
    this._inFlightVolRefresh = {};

    this._wireObsEvents();
  }

  // --- lifecycle ---
  start() {
    this._stopped = false;
    this._connect();
  }

  stop() {
    this._stopped = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    this._obs.disconnect().catch(() => {});
  }

  async _connect() {
    if (this._stopped) return;
    const { host, port, password } = this._cfg;
    const url = `ws://${host}:${port}`;
    try {
      await this._obs.connect(url, password || undefined, {
        eventSubscriptions: EVENT_SUB_MASK,
        rpcVersion: 1,
      });
      // 'Identified' fires -> onConnectionOpened primes state. Nothing else here.
    } catch (err) {
      this._log(`connect failed: ${err?.message || err}`);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    this._setConnected(false);
    if (this._stopped || this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, RECONNECT_MS);
  }

  // --- gate #1: connection flips ---
  _setConnected(v) {
    if (this.isConnected === v) return;
    this.isConnected = v;
    if (!v) {
      // wipe volatile state so keys show "disconnected", but keep nothing stale.
      this._mutedByInput = {};
      this._volumeDbByInput = {};
    }
    this._raiseStateChanged();
  }

  _wireObsEvents() {
    const obs = this._obs;

    obs.on('Identified', () => this._onConnectionOpened());
    obs.on('ConnectionClosed', () => {
      this._log('connection closed');
      this._scheduleReconnect();
    });
    obs.on('ConnectionError', (e) => this._log(`connection error: ${e?.message || e}`));

    // --- record ---
    obs.on('RecordStateChanged', (d) => {
      if (typeof d.outputActive === 'boolean' && d.outputActive !== this.isRecording) {
        this.isRecording = d.outputActive;
        this._raiseStateChanged();
      }
    });

    // --- studio mode ---
    obs.on('StudioModeStateChanged', (d) => {
      if (typeof d.studioModeEnabled === 'boolean' && d.studioModeEnabled !== this.studioModeEnabled) {
        this.studioModeEnabled = d.studioModeEnabled;
        this._raiseStateChanged();
      }
    });

    // --- scenes ---
    obs.on('CurrentProgramSceneChanged', (d) => {
      if (d.sceneName !== this.currentProgramScene) {
        this.currentProgramScene = d.sceneName;
        this._raiseStateChanged();
      }
    });
    obs.on('CurrentPreviewSceneChanged', (d) => {
      if (d.sceneName !== this.currentPreviewScene) {
        this.currentPreviewScene = d.sceneName;
        this._raiseStateChanged();
      }
    });
    const refreshScenes = () => this._refreshSceneList();
    obs.on('SceneListChanged', refreshScenes);
    obs.on('SceneCreated', refreshScenes);
    obs.on('SceneRemoved', refreshScenes);
    obs.on('SceneNameChanged', refreshScenes);

    // --- inputs: mute (gate #2) ---
    obs.on('InputMuteStateChanged', (d) => {
      if (typeof d.inputMuted !== 'boolean') return;
      if (this._mutedByInput[d.inputName] !== d.inputMuted) {
        this._mutedByInput[d.inputName] = d.inputMuted;
        this._raiseStateChanged();
      }
    });

    // --- inputs: volume (gate #3, dB epsilon) ---
    obs.on('InputVolumeChanged', (d) => {
      const db = d.inputVolumeDb;
      if (typeof db !== 'number' || !isFinite(db)) return;
      const prev = this._volumeDbByInput[d.inputName];
      if (prev === undefined || Math.abs(prev - db) > VOLUME_EPSILON_DB) {
        this._volumeDbByInput[d.inputName] = db;
        this._raiseStateChanged();
      }
    });
  }

  async _onConnectionOpened() {
    this._log('identified — priming state');
    try {
      const [rec, studio] = await Promise.all([
        this._obs.call('GetRecordStatus'),
        this._obs.call('GetStudioModeEnabled'),
      ]);
      this.isRecording = !!rec.outputActive;
      this.studioModeEnabled = !!studio.studioModeEnabled;
      await this._refreshSceneList(/*silent*/ true);
      // current program/preview scene
      try {
        const cur = await this._obs.call('GetCurrentProgramScene');
        this.currentProgramScene = cur.currentProgramSceneName ?? cur.sceneName ?? null;
      } catch { /* older OBS field name variance — ignore */ }
      if (this.studioModeEnabled) {
        try {
          const prev = await this._obs.call('GetCurrentPreviewScene');
          this.currentPreviewScene = prev.currentPreviewSceneName ?? prev.sceneName ?? null;
        } catch { /* ignore */ }
      }
    } catch (err) {
      this._log(`prime failed: ${err?.message || err}`);
    }
    // flip connected LAST so the first repaint has primed state.
    this.isConnected = true;
    this._raiseStateChanged();
  }

  async _refreshSceneList(silent = false) {
    try {
      const res = await this._obs.call('GetSceneList');
      // v5 returns newest-first; MX kept OBS order. Reverse to match the UI top-down.
      const names = (res.scenes || []).map((s) => s.sceneName).reverse();
      const changed = names.length !== this._sceneNames.length ||
        names.some((n, i) => n !== this._sceneNames[i]);
      this._sceneNames = names;
      if (changed && !silent) this._raiseStateChanged();
    } catch (err) {
      this._log(`GetSceneList failed: ${err?.message || err}`);
    }
  }

  // --- requests (exact obs-websocket v5 requestType in the comment) ---
  toggleRecord() { this._safe('ToggleRecord'); }
  toggleInputMute(inputName) { this._safe('ToggleInputMute', { inputName }); }
  setStudioModeEnabled(enabled) { this._safe('SetStudioModeEnabled', { studioModeEnabled: !!enabled }); }
  triggerStudioModeTransition() { this._safe('TriggerStudioModeTransition'); }
  setPreviewScene(sceneName) { this._safe('SetCurrentPreviewScene', { sceneName }); }
  setProgramScene(sceneName) { this._safe('SetCurrentProgramScene', { sceneName }); }

  setInputVolumeDb(inputName, db) {
    // optimistic local cache so the dial reads smoothly before the echo arrives.
    this._volumeDbByInput[inputName] = db;
    this._safe('SetInputVolume', { inputName, inputVolumeDb: db });
  }

  async _safe(requestType, params) {
    if (!this.isConnected) return;
    try {
      return await this._obs.call(requestType, params);
    } catch (err) {
      this._log(`${requestType} failed: ${err?.message || err}`);
    }
  }

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

  async refreshInputMuteAsync(inputName) {          // GetInputMute -> change-gated set
    if (!this.isConnected || !inputName || this._inFlightMuteRefresh[inputName]) return;
    this._inFlightMuteRefresh[inputName] = true;
    try {
      const r = await this._obs.call('GetInputMute', { inputName });
      if (typeof r.inputMuted === 'boolean' && this._mutedByInput[inputName] !== r.inputMuted) {
        this._mutedByInput[inputName] = r.inputMuted;
        this._raiseStateChanged();
      } else if (!(inputName in this._mutedByInput)) {
        // first prime with an unchanged value still needs to register "known".
        this._mutedByInput[inputName] = r.inputMuted;
        this._raiseStateChanged();
      }
    } catch (err) {
      this._log(`GetInputMute(${inputName}) failed: ${err?.message || err}`);
    } finally {
      this._inFlightMuteRefresh[inputName] = false;
    }
  }

  async refreshInputVolumeAsync(inputName) {        // GetInputVolume -> change-gated set
    if (!this.isConnected || !inputName || this._inFlightVolRefresh[inputName]) return;
    this._inFlightVolRefresh[inputName] = true;
    try {
      const r = await this._obs.call('GetInputVolume', { inputName });
      const db = r.inputVolumeDb;
      if (typeof db === 'number' && isFinite(db)) {
        const prev = this._volumeDbByInput[inputName];
        if (prev === undefined || Math.abs(prev - db) > VOLUME_EPSILON_DB) {
          this._volumeDbByInput[inputName] = db;
          this._raiseStateChanged();
        }
      }
    } catch (err) {
      this._log(`GetInputVolume(${inputName}) failed: ${err?.message || err}`);
    } finally {
      this._inFlightVolRefresh[inputName] = false;
    }
  }

  // --- internal ---
  _raiseStateChanged() {
    this.emit('stateChanged');
  }

  _log(msg) {
    // Studio captures stdout for Node plugins; keep it terse.
    console.log(`[obs] ${msg}`);
  }
}
