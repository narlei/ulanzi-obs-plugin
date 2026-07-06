// tokens.js — design tokens for THE PANEL look. SINGLE SOURCE OF TRUTH for colors
// and geometry, shared by the build-time face generator (scripts/gen-key-faces.mjs)
// and any runtime rendering. Colors sampled/derived from the mockup.
//
// Face grammar (per key, 196x196, rounded):
//   - a COLORED TOP ACCENT BAR (token `bar`) across the top edge — the key's identity color C
//   - a BODY fill below it (token `body`)
//   - a centered line GLYPH recolored to token `glyph_color`
//   - the LABEL is a Studio text overlay (NOT baked here); no caption row.
//
// Scene (3-tier), accent C chosen by the user's icon (monitor=blue, camera=purple, webcam=amber):
//   inactive: bar=C     body=black      glyph=C
//   preview : bar=C     body=C(flood)   glyph=ink
//   live    : bar=C     body=darkgreen  glyph=white   (bar ALWAYS stays C)
//
// Toggles (2-tier): off: bar=C body=black glyph=C   |   on: bar=C body=C glyph=ink
//   Record=red, Mute=red, Take=green, Studio=green, BRB=amber.

export const TOKENS = {
  // accent / function colors (C)
  red:       '#E5484D', // Record, Mute
  green:     '#35C66B', // Take, Studio (and generic "on-air")
  amber:     '#E0902F', // Scene(webcam)
  blue:      '#3A9BD4', // Scene(monitor)
  purple:    '#8B5CF6', // Scene(camera)
  magenta:   '#C558A8', // BRB (clean, slightly desaturated)
  yellow:    '#D6C24E', // Scene PREVIEW whole-key flood (slightly desaturated, non-eye-burning)

  // neutrals
  black:     '#0E1114', // idle/off body (mockup dark)
  ink:       '#0E1114', // dark glyph on a flooded (C or yellow) body
  white:     '#FFFFFF', // (retained; no longer used by Scene faces)
};

// geometry (px on a 196 canvas)
export const GEO = {
  canvas: 196,
  radiusPct: 14,       // rounded key corner
  accentBarPct: 11,    // top accent bar height
  glyphPct: 57,        // glyph size relative to canvas
  glyphOffsetY: 8,     // nudge glyph down so it sits under the bar
};

// scene icon -> accent color name (data-out-of-code; add a glyph = one line here)
export const SCENE_ICON_ACCENT = {
  monitor: 'blue',
  camera:  'purple',
  webcam:  'amber',
};

export function hex(name, fallback = TOKENS.white) {
  return TOKENS[(name || '').trim().toLowerCase()] || fallback;
}
