import sharp from "sharp";
import fs from "fs";

const src = "photo_2026-07-25_14-48-37.jpg";
const meta = await sharp(src).metadata();
console.log("source:", meta.width + "x" + meta.height, meta.format);

// Square icon, full logo visible (contain) on a transparent background.
const opts = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };

await sharp(src).resize(512, 512, opts).png().toFile("app/icon.png");
await sharp(src).resize(180, 180, opts).png().toFile("app/apple-icon.png");
console.log("wrote app/icon.png (512) and app/apple-icon.png (180)");

// Remove the default Vercel/Next favicon so it stops showing.
if (fs.existsSync("app/favicon.ico")) { fs.rmSync("app/favicon.ico"); console.log("removed app/favicon.ico"); }
