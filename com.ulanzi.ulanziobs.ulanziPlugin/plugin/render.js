// Key-face rendering — port of Icons.cs (black-idle / color-active).
//
// SCAFFOLD STUB. The palette + the two-state model are declared; the actual
// SVG recolor + compose + base64 pipeline is TODO (needs the device to tune).
//
// Model:
//   idleGlyph(iconName, iconColor) -> black key, icon stroked in iconColor
//   activeTile(iconName, fillColor) -> fillColor floods the key, icon drawn in INK (dark)
// Icons are SVGs in assets/actions/*.svg using stroke/fill="currentColor";
// recolor = string-replace currentColor -> #RRGGBB, then rasterize.
//
// IMPORTANT: memoize composed tiles (key: name|bg|iconColor). Rebuilding a bitmap
// on every repaint pegged the MX host at ~375% CPU. Same repaint-storm risk here.
//
// Delivery to the key: $UD.setBaseDataIcon(ctx, dataUri) (type1) or setPathIcon
// (type2) for pre-rendered files. Decide at code-time; base64 lets us recolor live.

// Palette (exact hex from Icons.cs).
export const PALETTE = {
  cyan: '#3A9BD4',   // scenes
  green: '#35C66B',  // take / live / on
  red: '#E5484D',    // mute / rec
  amber: '#E0902F',  // BRB
  slate: '#5A626E',  // offline / neutral
  white: '#FFFFFF',
  black: '#000000',  // idle key background
  ink: '#101216',    // dark icon on a color fill
};

// config sceneColors name -> hex; unknown -> fallback (scene keys pass cyan).
export function colorByName(name, fallback) {
  const key = (name || '').trim().toLowerCase();
  return PALETTE[key] || fallback;
}

// TODO: implement composed-tile cache + SVG recolor. Signatures fixed now so
// action stubs can reference them.
export function idleGlyph(iconName, iconColorHex) {
  // return dataUri
}

export function activeTile(iconName, fillColorHex) {
  // return dataUri
}
