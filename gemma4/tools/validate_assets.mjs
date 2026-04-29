#!/usr/bin/env node
// Validate that every sprite in assets/ has real alpha-channel transparency
// rather than a baked "transparency-grid" checkerboard pattern in opaque pixels.
//
// Background art (files prefixed with `bg_`) is exempt: those are meant to be
// fully opaque. Everything else must satisfy, on each of the four 16x16 corners:
//   - mean alpha < ALPHA_MAX (true transparency, not opaque background)
//
// This single check is sufficient: the failure mode we're catching is the
// model interpreting "transparent background" visually and rendering an
// opaque gray-and-white checkerboard. Such images have alpha=255 at every
// corner. A correctly bg-removed sprite has alpha~=0 at every corner. The
// gap is huge — there is no false-positive risk and no need for fragile
// luminance/bimodality heuristics.
//
// Exit code 0 = all good. Exit code 1 = one or more sprites failed.
//
// Pure-Node, zero npm deps. PNG decoding is implemented inline against the
// PNG 1.2 spec (color types 2 and 6, 8-bit depth, non-interlaced). This is
// the format that all mainstream image-gen models (Flux, SDXL, Imagen,
// Recraft) and bg-removal models (birefnet, rembg, bria) produce.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { inflateSync } from "node:zlib";

const ASSETS_DIR = resolve(process.argv[2] ?? "assets");
const ALPHA_CORNER = 16; // corner sample size in px
const ALPHA_MAX = 16; // 0..255; corners must average below this to count as transparent

// ---------- PNG decoder (8-bit RGB or RGBA, non-interlaced) ----------

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("not a PNG");
  }
  let i = 8;
  let ihdr = null;
  const idatChunks = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i); i += 4;
    const type = buf.toString("ascii", i, i + 4); i += 4;
    const data = buf.subarray(i, i + len); i += len;
    i += 4; // CRC
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (!ihdr) throw new Error("missing IHDR");
  if (ihdr.bitDepth !== 8) throw new Error(`unsupported bit depth ${ihdr.bitDepth}`);
  if (ihdr.interlace !== 0) throw new Error("interlaced PNG unsupported");
  if (ihdr.colorType !== 2 && ihdr.colorType !== 6) {
    throw new Error(`unsupported color type ${ihdr.colorType} (need 2=RGB or 6=RGBA)`);
  }
  const channels = ihdr.colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = ihdr.width * channels;
  const out = Buffer.alloc(stride * ihdr.height);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const dst = Buffer.alloc(stride);
    switch (filter) {
      case 0:
        row.copy(dst);
        break;
      case 1:
        for (let x = 0; x < stride; x++) {
          dst[x] = (row[x] + (x >= channels ? dst[x - channels] : 0)) & 0xff;
        }
        break;
      case 2:
        for (let x = 0; x < stride; x++) dst[x] = (row[x] + prev[x]) & 0xff;
        break;
      case 3:
        for (let x = 0; x < stride; x++) {
          const left = x >= channels ? dst[x - channels] : 0;
          const up = prev[x];
          dst[x] = (row[x] + ((left + up) >> 1)) & 0xff;
        }
        break;
      case 4:
        for (let x = 0; x < stride; x++) {
          const a = x >= channels ? dst[x - channels] : 0;
          const b = prev[x];
          const c = x >= channels ? prev[x - channels] : 0;
          const pp = a + b - c;
          const pa = Math.abs(pp - a);
          const pb = Math.abs(pp - b);
          const pc = Math.abs(pp - c);
          const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          dst[x] = (row[x] + paeth) & 0xff;
        }
        break;
      default:
        throw new Error(`unsupported filter ${filter}`);
    }
    dst.copy(out, y * stride);
    prev = dst;
  }
  return { width: ihdr.width, height: ihdr.height, channels, pixels: out };
}

// ---------- corner alpha check ----------

function meanCornerAlpha(img, x0, y0) {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y0 + ALPHA_CORNER; y++) {
    for (let x = x0; x < x0 + ALPHA_CORNER; x++) {
      const idx = (y * img.width + x) * img.channels;
      sum += img.channels === 4 ? img.pixels[idx + 3] : 255;
      count++;
    }
  }
  return sum / count;
}

function validateFile(path) {
  const img = decodePng(readFileSync(path));
  if (img.width < ALPHA_CORNER * 2 || img.height < ALPHA_CORNER * 2) {
    return { ok: false, errors: [`image too small (${img.width}x${img.height}, need >= ${ALPHA_CORNER * 2}px each side)`] };
  }
  if (img.channels !== 4) {
    return { ok: false, errors: [`PNG has no alpha channel (color type RGB) — bg-removal step was skipped`] };
  }
  const corners = [
    { name: "top-left",     x: 0,                          y: 0 },
    { name: "top-right",    x: img.width - ALPHA_CORNER,   y: 0 },
    { name: "bottom-left",  x: 0,                          y: img.height - ALPHA_CORNER },
    { name: "bottom-right", x: img.width - ALPHA_CORNER,   y: img.height - ALPHA_CORNER },
  ];
  const errors = [];
  for (const c of corners) {
    const a = meanCornerAlpha(img, c.x, c.y);
    if (a >= ALPHA_MAX) {
      errors.push(`${c.name} corner is opaque (mean alpha ${a.toFixed(1)}, need < ${ALPHA_MAX}) — likely a baked transparency-grid checkerboard, not real alpha`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---------- main ----------

function isSprite(name) {
  return name.endsWith(".png") && !basename(name).startsWith("bg_");
}

let stat;
try {
  stat = statSync(ASSETS_DIR);
} catch {
  console.error(`[validate_assets] no such directory: ${ASSETS_DIR}`);
  process.exit(1);
}
if (!stat.isDirectory()) {
  console.error(`[validate_assets] not a directory: ${ASSETS_DIR}`);
  process.exit(1);
}

const files = readdirSync(ASSETS_DIR).filter(isSprite).sort();
if (files.length === 0) {
  console.error(`[validate_assets] no sprite PNGs found in ${ASSETS_DIR} (background files prefixed bg_ are exempt)`);
  process.exit(1);
}

let failed = 0;
for (const name of files) {
  const path = join(ASSETS_DIR, name);
  let result;
  try {
    result = validateFile(path);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    failed++;
    continue;
  }
  if (result.ok) {
    console.log(`OK   ${name}`);
  } else {
    console.error(`FAIL ${name}`);
    for (const err of result.errors) console.error(`     - ${err}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n[validate_assets] ${failed}/${files.length} sprite(s) failed.`);
  console.error("Re-run background removal on the failing files (or regenerate with a stronger negative prompt).");
  console.error("See GAME_DEV.md > 'Asset post-processing pipeline' for the full recovery procedure.");
  process.exit(1);
}
console.log(`\n[validate_assets] all ${files.length} sprite(s) passed.`);
