/**
 * generate-icons.mjs
 *
 * Generates PWA icon SVGs for Zaloon.
 * Run with: node scripts/generate-icons.mjs
 *
 * The icons are simple green-circle + "Z" letter designs matching the brand.
 * If you want PNG output, install the `canvas` package:
 *   npm install canvas
 * and uncomment the PNG generation section at the bottom.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

mkdirSync(publicDir, { recursive: true });

function makeSvg(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const fontSize = Math.round(size * 0.572);
  const textY = Math.round(size * 0.688);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#B4EFA5"/>
  <text x="${cx}" y="${textY}" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="700" fill="#0a1f0a" text-anchor="middle" dominant-baseline="auto">Z</text>
</svg>`;
}

writeFileSync(resolve(publicDir, "favicon.svg"), makeSvg(32));
writeFileSync(resolve(publicDir, "icon-192.svg"), makeSvg(192));
writeFileSync(resolve(publicDir, "icon-512.svg"), makeSvg(512));

console.log("SVG icons written to public/");
console.log("  favicon.svg (32x32)");
console.log("  icon-192.svg (192x192)");
console.log("  icon-512.svg (512x512)");

/*
 * PNG generation — requires `npm install canvas`
 *
 * import { createCanvas } from "canvas";
 *
 * function writePng(size, filename) {
 *   const canvas = createCanvas(size, size);
 *   const ctx = canvas.getContext("2d");
 *   ctx.beginPath();
 *   ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
 *   ctx.fillStyle = "#B4EFA5";
 *   ctx.fill();
 *   ctx.fillStyle = "#0a1f0a";
 *   ctx.font = `700 ${Math.round(size * 0.572)}px system-ui`;
 *   ctx.textAlign = "center";
 *   ctx.textBaseline = "alphabetic";
 *   ctx.fillText("Z", size / 2, Math.round(size * 0.688));
 *   writeFileSync(resolve(publicDir, filename), canvas.toBuffer("image/png"));
 *   console.log(`  ${filename} (${size}x${size})`);
 * }
 *
 * writePng(192, "icon-192.png");
 * writePng(512, "icon-512.png");
 */
