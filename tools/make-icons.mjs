/**
 * Generate `listing/icon.png` for every marketplace pack.
 *
 * One visual system: a rounded-square tile carrying a vertical gradient keyed to the pack's
 * LISTING CATEGORY (so a category reads as a colour family at a glance in a grouped catalog),
 * plus a white line-art glyph unique to the pack. Line art rather than emoji because the SVG
 * rasteriser has no emoji font to fall back on — a text glyph would silently render as tofu.
 *
 * PNG, not SVG: the platform's artifact collector classifies by extension
 * (`BINARY_EXT` in pack-meta/pack-source.ts) and SVG is not in it — an .svg would land in the
 * artifact's TEXT half, and `/api/packs/:id/:ver/asset/*` reads only blobs, so it would 404.
 *
 * Usage:  node make-icons.mjs <marketplace-repo-root>
 * Needs:  sharp  (run it from a checkout that has it, e.g. the platform repo)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = process.argv[2]
if (!ROOT) { console.error('usage: node make-icons.mjs <marketplace-repo-root>'); process.exit(1) }

const SIZE = 512

/** category → [gradient top, gradient bottom]. */
const CATEGORY_COLOR = {
  finance:       ['#34d399', '#047857'],
  healthcare:    ['#38bdf8', '#0369a1'],
  retail:        ['#a78bfa', '#6d28d9'],
  services:      ['#fbbf24', '#b45309'],
  'real-estate': ['#94a3b8', '#334155'],
  logistics:     ['#22d3ee', '#0e7490'],
  automotive:    ['#fb7185', '#be123c'],
  education:     ['#818cf8', '#3730a3'],
  hospitality:   ['#f472b6', '#9d174d'],
}

// Glyphs draw on a 100x100 canvas. `S` = the shared stroke preset; keep every glyph inside
// roughly 24..76 so the tile's optical padding stays even across the set.
const S = 'fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"'
const F = 'fill="#fff"'

const PACKS = {
  // ── healthcare ───────────────────────────────────────────────────────────
  'clinic':            { category: 'healthcare', glyph: `<path ${S} d="M50 27V73M27 50H73"/>` },
  'smile-dental':      { category: 'healthcare', glyph:
    `<path ${S} d="M33 28c-7 0-11 6-11 13 0 11 5 15 7 24 2 8 3 11 6 11 4 0 4-9 6-13 1-3 4-3 5 0 2 4 2 13 6 13 3 0 4-3 6-11 2-9 7-13 7-24 0-7-4-13-11-13-6 0-8 4-11 4s-5-4-10-4z"/>` },
  'pharmaplus-rx':     { category: 'healthcare', glyph:
    `<g transform="rotate(-45 50 50)"><rect x="24" y="39" width="52" height="22" rx="11" ${S}/><path ${S} d="M50 39v22"/></g>` },

  // ── finance ──────────────────────────────────────────────────────────────
  'barakah-finance':   { category: 'finance', glyph:
    `<path ${S} d="M26 51 50 30l24 21"/><path ${S} d="M33 50v22h34V50"/><path ${S} d="M44 72V59h12v13"/>` },
  'shield-motor':      { category: 'finance', glyph:
    `<path ${S} d="M50 25l23 8v18c0 13-10 20-23 24-13-4-23-11-23-24V33z"/><path ${S} d="M41 51l6 7 13-14"/>` },

  // ── retail ───────────────────────────────────────────────────────────────
  'ecommerce':         { category: 'retail', glyph:
    `<path ${S} d="M29 40h42l-4 32H33z"/><path ${S} d="M40 40v-6a10 10 0 0 1 20 0v6"/>` },
  'oud-atelier':       { category: 'retail', glyph:
    `<path ${S} d="M43 27h14v10H43z"/><path ${S} d="M38 47a10 10 0 0 1 7-10h10a10 10 0 0 1 7 10v18a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8z"/><path ${S} d="M46 55h8"/>` },

  // ── services ─────────────────────────────────────────────────────────────
  'glamour-salon':     { category: 'services', glyph:
    `<circle cx="34" cy="68" r="7" ${S}/><circle cx="66" cy="68" r="7" ${S}/><path ${S} d="M39 63 66 28M61 63 34 28"/>` },
  // A HAMMER, not a wrench: motorcare-service already owns the wrench, and two tool glyphs in
  // one grid read as the same pack twice.
  'homefix-services':  { category: 'services', glyph:
    `<path ${S} d="M54 24 76 46l-10 10-22-22z"/><path ${S} d="M44 42 26 60a8 8 0 0 0 11 11l18-18"/>` },
  'ironpulse-fitness': { category: 'services', glyph:
    `<path ${S} d="M38 50h24"/><rect x="24" y="38" width="12" height="24" rx="4" ${S}/><rect x="64" y="38" width="12" height="24" rx="4" ${S}/>` },

  // ── logistics ────────────────────────────────────────────────────────────
  'kaiian':            { category: 'logistics', glyph:
    `<path ${S} d="M50 27 74 39v22L50 73 26 61V39z"/><path ${S} d="M26 39l24 12 24-12M50 51v22"/>` },
  'swiftship-courier': { category: 'logistics', glyph:
    `<path ${S} d="M24 34h30v28H24z"/><path ${S} d="M54 44h12l10 10v8H54z"/><circle cx="36" cy="68" r="6" ${S}/><circle cx="65" cy="68" r="6" ${S}/>` },

  // ── automotive ───────────────────────────────────────────────────────────
  'motorcare-service': { category: 'automotive', glyph:
    `<path ${S} d="M69 31a11 11 0 0 0-15 13L30 68a7 7 0 0 0 10 10l24-24a11 11 0 0 0 13-15l-8 8-8-8z"/>` },
  // Car sits low so the EV bolt above it is big enough to read as a bolt rather than an aerial.
  'xpeng-egypt':       { category: 'automotive', glyph:
    `<path ${F} d="M55 17 41 40h9l-5 15 16-22h-9z"/><path ${S} d="M26 65v-8l6-13h36l6 13v8"/><path ${S} d="M26 65h48v8H26z"/><circle cx="37" cy="73" r="5" ${S}/><circle cx="63" cy="73" r="5" ${S}/>` },

  // ── education ────────────────────────────────────────────────────────────
  'nile-academy':      { category: 'education', glyph:
    `<path ${S} d="M20 44 50 31l30 13-30 13z"/><path ${S} d="M32 51v14c0 5 8 8 18 8s18-3 18-8V51"/><path ${S} d="M80 44v14"/>` },

  // ── real estate ──────────────────────────────────────────────────────────
  'gulf-realty':       { category: 'real-estate', glyph:
    `<path ${S} d="M30 73V32l20-7 20 7v41"/><path ${S} d="M41 42h6M53 42h6M41 54h6M53 54h6"/><path ${S} d="M44 73V64h12v9"/>` },

  // ── hospitality ──────────────────────────────────────────────────────────
  'redsea-resorts':    { category: 'hospitality', glyph:
    `<circle cx="50" cy="40" r="11" ${S}/><path ${S} d="M24 62c5 0 5 4 10 4s5-4 10-4 5 4 10 4 5-4 10-4 5 4 10 4"/><path ${S} d="M24 73c5 0 5 4 10 4s5-4 10-4 5 4 10 4 5-4 10-4 5 4 10 4"/>` },
  // Served plate + steam. The vertical spit it replaced read as a lollipop.
  'shawarma-express':  { category: 'hospitality', glyph:
    `<path ${S} d="M28 62a22 22 0 0 1 44 0z"/><path ${S} d="M22 70h56"/><path ${S} d="M42 30v8M50 26v12M58 30v8"/>` },
  'umrah-journeys':    { category: 'hospitality', glyph:
    `<path ${S} d="M62 28a24 24 0 1 0 0 44 20 20 0 0 1 0-44z"/><path ${F} d="m72 40 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/>` },
}

function tile(category, glyph) {
  const [from, to] = CATEGORY_COLOR[category] ?? ['#64748b', '#1e293b']
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  ${glyph}
</svg>`
}

const entries = Object.entries(PACKS)
let total = 0
for (const [packId, { category, glyph }] of entries) {
  const dir = join(ROOT, packId, 'listing')
  mkdirSync(dir, { recursive: true })
  const png = await sharp(Buffer.from(tile(category, glyph))).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(join(dir, 'icon.png'), png)
  total += png.length
  console.log(`  ✓ ${packId}/listing/icon.png  ${String(png.length).padStart(6)} B  (${category})`)
}
console.log(`\n${entries.length} icons, ${(total / 1024).toFixed(1)} KB total`)
