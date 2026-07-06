// Config loader — mirrors MxObsPlugin.cs ReadConfigFile / ReadObsSettings.
//
// Reads ~/.config/ulanzi-obs/config.json (git-ignored; may hold the OBS
// WebSocket password). Every key is optional; missing file -> defaults.
//
// PASSWORD (data-out-of-code): if the user config sets no `password`, fall back
// to reading OBS's OWN auto-generated password from its plugin config on disk
// (same value Ulanzi Studio's built-in OBS plugin uses). This keeps the secret
// out of our repo/config entirely and auto-tracks OBS regenerating it.
//
// Schema (see ../../config.example.json):
//   { host, port, password, micInput, brbScene,
//     sceneColors: { "<name|base>": "<palette>" }, sceneIcons: { "<name|base>": "<icon>" } }

import { readFileSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';

const DEFAULTS = {
  host: '127.0.0.1',
  port: 4455,
  password: '',
  micInput: 'Scarlett Solo',
  brbScene: 'BRB', // a PREFIX, not an exact scene name
  sceneColors: {}, // scene/base name -> palette name (cyan|green|red|amber|slate|white)
  sceneIcons: {},  // scene/base name -> icon name (camera|webcam|monitor|scenes); default 'scenes'
};

export function configPath() {
  return join(homedir(), '.config', 'ulanzi-obs', 'config.json');
}

export function loadConfig() {
  let fileCfg = {};
  try {
    fileCfg = JSON.parse(readFileSync(configPath(), 'utf8'));
  } catch {
    // Missing/unreadable/invalid -> defaults apply.
  }
  const cfg = { ...DEFAULTS, ...pickKnown(fileCfg) };
  cfg.sceneColors = normalizeStringMap(fileCfg.sceneColors);
  cfg.sceneIcons = normalizeStringMap(fileCfg.sceneIcons);
  // No password in the user config -> read OBS's own auto-generated one.
  if (!cfg.password) cfg.password = readObsWebSocketPassword();
  return cfg;
}

// OBS stores its WebSocket server password in cleartext in its plugin config.
// Read it so the user never has to copy/paste a secret. Returns '' if not found
// (then we connect with no password and rely on OBS having auth disabled).
export function obsWebSocketConfigPath() {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'obs-studio',
        'plugin_config', 'obs-websocket', 'config.json');
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'),
        'obs-studio', 'plugin_config', 'obs-websocket', 'config.json');
    default: // linux
      return join(home, '.config', 'obs-studio',
        'plugin_config', 'obs-websocket', 'config.json');
  }
}

function readObsWebSocketPassword() {
  try {
    const obs = JSON.parse(readFileSync(obsWebSocketConfigPath(), 'utf8'));
    // Only use it if auth is actually required; empty otherwise.
    if (obs.auth_required && typeof obs.server_password === 'string') {
      return obs.server_password;
    }
  } catch {
    // OBS not installed / config absent / unreadable -> no password.
  }
  return '';
}

// Only accept the five known scalar keys (ignore _comment-style keys like the MX example).
function pickKnown(o) {
  const out = {};
  for (const k of ['host', 'port', 'password', 'micInput', 'brbScene']) {
    if (o[k] !== undefined && o[k] !== null) out[k] = o[k];
  }
  if (typeof out.port === 'string') {
    const n = parseInt(out.port, 10);
    out.port = Number.isNaN(n) ? DEFAULTS.port : n;
  }
  return out;
}

// sceneColors / sceneIcons: keep only string values (palette or icon names).
// Case-insensitive lookups are handled by consumers.
function normalizeStringMap(m) {
  const out = {};
  if (m && typeof m === 'object') {
    for (const [k, v] of Object.entries(m)) {
      if (typeof v === 'string') out[k] = v;
    }
  }
  return out;
}
