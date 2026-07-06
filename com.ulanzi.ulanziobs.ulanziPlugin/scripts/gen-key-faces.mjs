// gen-key-faces.mjs — build-time asset generator (one task: rasterize key-face PNGs).
//
// THE PANEL grammar. Each face declared in scripts/key-faces.json becomes a 196x196 PNG:
//   1. rounded key filled with the BODY color
//   2. a COLORED TOP ACCENT BAR (the key's identity color C) across the top edge
//   3. the GLYPH (an assets/actions/<glyph>.svg, currentColor -> glyph_color) centered,
//      nudged down so it clears the bar
// Colors + geometry come from plugin/tokens.js (single source of truth). The LABEL is a
// Studio text overlay at runtime — never baked here. No caption row.
//
// Inputs (data out of code): scripts/key-faces.json + plugin/tokens.js TOKENS/GEO
// Outputs:                   assets/actions/<out>.png (referenced by manifest States[].Image)
// Tools:                     rsvg-convert (SVG->PNG at exact size) + ImageMagick `magick`
// Run:                       npm run gen:faces  (or: node scripts/gen-key-faces.mjs)

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(HERE, '..');
const ACTIONS = join(PLUGIN, 'assets', 'actions');

function requireTool(bin) {
  try { execFileSync(bin, ['--version'], { stdio: 'ignore' }); }
  catch { throw new Error(`required tool '${bin}' not found on PATH`); }
}

async function main() {
  requireTool('rsvg-convert');
  requireTool('magick');

  // tokens are the single source of truth for colors + geometry
  const { TOKENS, GEO } = await import(pathToFileURL(join(PLUGIN, 'plugin', 'tokens.js')));
  const spec = JSON.parse(readFileSync(join(HERE, 'key-faces.json'), 'utf8'));

  const C = GEO.canvas;
  const R = Math.round((C * GEO.radiusPct) / 100);
  const BAR = Math.round((C * GEO.accentBarPct) / 100);
  const G = Math.round((C * GEO.glyphPct) / 100);
  const OFF = GEO.glyphOffsetY;

  const resolve = (name, face) => {
    const v = TOKENS[name];
    if (!v) throw new Error(`face ${face.out}: unknown token '${name}'`);
    return v;
  };

  const tmp = mkdtempSync(join(tmpdir(), 'keyfaces-'));
  let n = 0;
  try {
    for (const f of spec.faces) {
      const barHex = resolve(f.bar, f);
      const bodyHex = resolve(f.body, f);
      const glyphHex = resolve(f.glyph_color, f);

      const bodyPng = join(tmp, `${f.out}.body.png`);
      const barPng = join(tmp, `${f.out}.bar.png`);
      const glyphSvg = join(tmp, `${f.out}.svg`);
      const glyphPng = join(tmp, `${f.out}.glyph.png`);

      // 1. rounded key body
      execFileSync('magick', [
        '-size', `${C}x${C}`, 'xc:none', '-fill', bodyHex,
        '-draw', `roundrectangle 0,0 ${C - 1},${C - 1} ${R},${R}`, bodyPng,
      ]);

      // 2. accent bar: a full rounded key in bar color, cropped to the top BAR rows
      //    (keeps the rounded top corners, straight bottom edge).
      execFileSync('magick', [
        '-size', `${C}x${C}`, 'xc:none', '-fill', barHex,
        '-draw', `roundrectangle 0,0 ${C - 1},${C - 1} ${R},${R}`,
        '-crop', `${C}x${BAR}+0+0`, '+repage', barPng,
      ]);

      // 3. glyph recolored + rasterized
      const svg = readFileSync(join(ACTIONS, `${f.glyph}.svg`), 'utf8').replaceAll('currentColor', glyphHex);
      writeFileSync(glyphSvg, svg);
      execFileSync('rsvg-convert', ['-w', String(G), '-h', String(G), glyphSvg, '-o', glyphPng]);

      // 4. compose: body <- bar(top) <- glyph(center, nudged below bar)
      const out = join(ACTIONS, `${f.out}.png`);
      execFileSync('magick', [
        bodyPng,
        barPng, '-gravity', 'north', '-composite',
        glyphPng, '-gravity', 'center', '-geometry', `+0+${OFF}`, '-composite',
        out,
      ]);

      n++;
      console.log(`  ${f.out}.png  (${f.glyph}: ${f.glyph_color} glyph, ${f.bar} bar, ${f.body} body)`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`generated ${n} key-face PNGs at ${C}x${C} -> assets/actions/`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
