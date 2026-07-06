// OBS Control for Ulanzi D200X — main service entry point.
//
// SCAFFOLD STUB. This wires the Ulanzi Studio bridge ($UD) to per-action instances
// and routes key/encoder events, but the action bodies and the OBS client are stubs.
// See ../../PORTING.md for the full MX -> D200X mapping that each action implements.
//
// Runtime: Node.js v20 (bundled in Ulanzi Studio), ES modules.
// The host launches this process passing argv = [address, port, language] and the
// plugin connects back to Ulanzi Studio on ws://127.0.0.1:3906 (see ulanzi-api).

import { UlanziApi } from './actions/ulanzi-api/index.js';
import { loadConfig } from './config.js';
import { ObsClient } from './obs/ObsClient.js';

import RecordAction from './actions/Record.js';
import MuteAction from './actions/Mute.js';
import StudioAction from './actions/Studio.js';
import TakeAction from './actions/Take.js';
import BrbAction from './actions/Brb.js';
import SceneAction from './actions/Scene.js';
import MicGainAction from './actions/MicGain.js';

const PLUGIN_UUID = 'com.ulanzi.ulanzistudio.ulanziobs';

// Map an action UUID (from a placed key/encoder) to its implementation class.
const ACTION_CLASSES = {
  [`${PLUGIN_UUID}.record`]: RecordAction,
  [`${PLUGIN_UUID}.mute`]: MuteAction,
  [`${PLUGIN_UUID}.studio`]: StudioAction,
  [`${PLUGIN_UUID}.take`]: TakeAction,
  [`${PLUGIN_UUID}.brb`]: BrbAction,
  [`${PLUGIN_UUID}.scene`]: SceneAction,
  [`${PLUGIN_UUID}.micgain`]: MicGainAction,
};

// One shared OBS connection for the whole plugin (mirrors MxObsPlugin.Obs).
const config = loadConfig();
const obs = new ObsClient(config);

// context -> live action instance (one per placed key/encoder).
const INSTANCES = {};

const $UD = new UlanziApi();
$UD.connect(PLUGIN_UUID);

$UD.onConnected(() => {
  // Bridge to Ulanzi Studio is up. Start (or ensure) the OBS connection.
  obs.start();
});

// --- lifecycle: action placed on a key/encoder ---
$UD.onAdd((jsn) => {
  const ctx = jsn.context;
  if (!INSTANCES[ctx]) {
    const Cls = ACTION_CLASSES[jsn.uuid];
    if (!Cls) return; // unknown action uuid — ignore
    INSTANCES[ctx] = new Cls(ctx, $UD, obs, config);
  }
  applySettings(jsn);
});

// --- page containing the action became visible / hidden ---
$UD.onSetActive((jsn) => {
  INSTANCES[jsn.context]?.setActive?.(jsn.active);
});

// --- keypad press (the main trigger for keypad actions) ---
$UD.onRun((jsn) => {
  const inst = INSTANCES[jsn.context];
  if (!inst) {
    // Not yet cached (e.g. press before add settled) — replay add then run.
    $UD.emit('add', jsn);
    return;
  }
  inst.run?.(jsn);
});

// --- encoder rotate (Mic Gain): jsn.rotateEvent is a DIRECTION ('left'/'right'/hold-*), no magnitude ---
$UD.onDialRotate((jsn) => {
  INSTANCES[jsn.context]?.rotate?.(jsn);
});

// --- encoder press (Mic Gain reset) ---
$UD.onDialDown((jsn) => {
  INSTANCES[jsn.context]?.dialDown?.(jsn);
});
$UD.onDialUp((jsn) => {
  INSTANCES[jsn.context]?.dialUp?.(jsn);
});

// --- action removed from one or more keys (param is an ARRAY, each with .context) ---
$UD.onClear((jsn) => {
  if (!jsn.param) return;
  for (const item of jsn.param) {
    const ctx = item.context;
    INSTANCES[ctx]?.destroy?.();
    delete INSTANCES[ctx];
  }
});

// --- settings changed (host restore or echoed from a Property Inspector) ---
$UD.onParamFromApp((jsn) => applySettings(jsn));
$UD.onParamFromPlugin((jsn) => applySettings(jsn));

// A Property Inspector requests the live OBS scene list via sendToPlugin (a
// NON-persisting pass-through). We reply via sendToPropertyInspector (also
// non-persisting). IMPORTANT: never use sendParamFromPlugin for this — that channel
// PERSISTS whatever it sends as the key's settings, which would clobber the saved
// { scene, target, icon } and reset the key on every restart.
$UD.on('sendToPlugin', (jsn) => {
  const req = (jsn && jsn.payload) || {};
  if (req.action !== 'getScenes') return;
  // The dispatcher populates jsn.context before emitting; reply to that PI only.
  $UD.sendToPropertyInspector?.(
    { scenes: obs.getAllScenes(), brbScene: config.brbScene },
    jsn.context
  );
});

function applySettings(jsn) {
  const settings = jsn.param || {};
  const inst = INSTANCES[jsn.context];
  if (!inst || JSON.stringify(settings) === '{}') return;
  inst.updateSettings?.(settings);
}

// OBS state changes -> repaint every live key.
// (ObsClient change-gates these so we don't repaint-storm; see PORTING.md CPU note.)
obs.on('stateChanged', () => {
  for (const inst of Object.values(INSTANCES)) {
    inst.render?.();
  }
});
