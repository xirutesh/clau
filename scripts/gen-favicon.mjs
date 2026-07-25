import sharp from "sharp";
import fs from "fs";

const src = "photo_2026-07-25_14-48-37.jpg";
const meta = await sharp(src).metadata();
console.log("source:", meta.width + "x" + meta.height, meta.format);

// Circular favicon: fill a square, then keep only the inscribed circle (transparent corners).
function circle(size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return sharp(src).resize(size, size, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png();
}

await circle(512).toFile("app/icon.png");
await circle(180).toFile("app/apple-icon.png");
console.log("wrote round app/icon.png (512) and app/apple-icon.png (180)");

if (fs.existsSync("app/favicon.ico")) { fs.rmSync("app/favicon.ico"); console.log("removed app/favicon.ico"); }
