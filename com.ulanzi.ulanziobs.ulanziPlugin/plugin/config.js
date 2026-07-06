// Config loader — mirrors MxObsPlugin.cs ReadConfigFile / ReadObsSettings.
//
// Reads ~/.config/ulanzi-obs/config.json (git-ignored; holds the OBS
// WebSocket password). Every key is optional; missing file -> defaults.
//
// Schema (see ../../config.example.json):
//   { host, port, password, micInput, brbScene,
//     sceneColors: { "<name|base>": "<palette>" }, sceneIcons: { "<name|base>": "<icon>" } }

import { readFileSync } from 'fs';
import { homedir } from 'os';
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
  return cfg;
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
