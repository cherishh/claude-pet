#!/usr/bin/env node
/**
 * Generates a pixel-art LOBSTER spritesheet.
 * 32x32 per frame, 8 cols, 9 rows (9 animation states).
 */
const fs = require("fs");
const zlib = require("zlib");

const W = 32, H = 32, COLS = 8, ROWS = 9;
const imgW = W * COLS, imgH = H * ROWS;
const pixels = new Uint8Array(imgW * imgH * 4);

// --- Drawing primitives ---
function setPixel(x, y, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= imgW || y < 0 || y >= imgH) return;
  const i = (y * imgW + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
}

function fillRect(x, y, w, h, r, g, b, a) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a);
}

function fillEllipse(cx, cy, rx, ry, r, g, b, a) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx*dx)/(rx*rx+0.1) + (dy*dy)/(ry*ry+0.1) <= 1)
        setPixel(cx + dx, cy + dy, r, g, b, a);
}

function fillCircle(cx, cy, rad, r, g, b, a) { fillEllipse(cx, cy, rad, rad, r, g, b, a); }

function drawLine(x0, y0, x1, y1, r, g, b, a) {
  x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
  const sx = x0<x1?1:-1, sy = y0<y1?1:-1;
  let err = dx - dy;
  while (true) {
    setPixel(x0, y0, r, g, b, a);
    if (x0===x1 && y0===y1) break;
    const e2 = 2*err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// --- Color palette ---
const C = {
  body:  [215, 55, 35],
  dark:  [155, 30, 15],
  light: [245, 90, 60],
  belly: [240, 135, 95],
  white: [255, 255, 255],
  pupil: [25, 12, 35],
  ant:   [145, 28, 12],
  shine: [220, 235, 255],
  blushC:[255, 130, 130],
};

// --- Draw the lobster ---
function drawLobster(ox, oy, o = {}) {
  const bounce   = o.bounce   ?? 0;
  const eyeX     = o.eyeX     ?? 0;
  const eyeOpen  = o.eyeOpen  ?? true;
  const eyeType  = o.eyeType  ?? "normal";
  const mouth    = o.mouth    ?? "neutral";
  const clawLY   = o.clawLY   ?? 0;
  const clawRY   = o.clawRY   ?? 0;
  const clawLOpen= o.clawLOpen?? true;
  const clawROpen= o.clawROpen?? true;
  const antW     = o.antWiggle ?? 0;
  const blush    = o.blush    ?? false;

  const bx = ox, by = oy + bounce;

  // --- Arms (behind body) ---
  drawLine(bx+9, by+12-clawLY, bx+12, by+15, ...C.dark);
  drawLine(bx+10,by+12-clawLY, bx+13, by+15, ...C.body);
  drawLine(bx+23,by+12-clawRY, bx+20, by+15, ...C.dark);
  drawLine(bx+22,by+12-clawRY, bx+19, by+15, ...C.body);

  // --- Tail (behind body) ---
  fillEllipse(bx+16, by+23, 3, 1, ...C.body);
  fillRect(bx+15, by+24, 3, 1, ...C.dark);
  fillEllipse(bx+16, by+25, 2, 1, ...C.body);
  // Tail fan
  fillRect(bx+12, by+27, 3, 1, ...C.dark);
  fillRect(bx+13, by+28, 2, 1, ...C.body);
  fillRect(bx+15, by+26, 3, 2, ...C.body);
  fillRect(bx+18, by+27, 3, 1, ...C.dark);
  fillRect(bx+18, by+28, 2, 1, ...C.body);

  // --- Legs (3 pairs, behind body) ---
  for (let i = 0; i < 3; i++) {
    const lx = bx + 11 + i, rx = bx + 20 + i;
    const legY = by + 22 + (i % 2);
    setPixel(lx, legY, ...C.dark);
    setPixel(lx, legY+1, ...C.dark);
    setPixel(lx-1, legY+2, ...C.dark);
    setPixel(rx, legY, ...C.dark);
    setPixel(rx, legY+1, ...C.dark);
    setPixel(rx+1, legY+2, ...C.dark);
  }

  // --- Body ---
  fillEllipse(bx+16, by+17, 7, 5, ...C.body);
  fillEllipse(bx+16, by+15, 5, 3, ...C.light);
  fillEllipse(bx+16, by+19, 6, 3, ...C.dark);
  fillEllipse(bx+16, by+17, 6, 4, ...C.body);
  fillEllipse(bx+16, by+19, 3, 2, ...C.belly);

  // --- Claws ---
  // Left claw
  const lcx = bx+6, lcy = by+9-clawLY;
  if (clawLOpen) {
    fillRect(lcx-2, lcy-2, 5, 2, ...C.light);
    fillRect(lcx-3, lcy-1, 1, 1, ...C.light);
    fillRect(lcx-2, lcy+1, 5, 2, ...C.body);
    fillRect(lcx-3, lcy+2, 1, 1, ...C.body);
    fillRect(lcx-1, lcy, 3, 1, ...C.dark);
    fillRect(lcx, lcy+3, 3, 2, ...C.body);
  } else {
    fillRect(lcx-2, lcy-1, 5, 4, ...C.body);
    fillRect(lcx-1, lcy, 3, 2, ...C.light);
    fillRect(lcx, lcy+3, 3, 2, ...C.body);
  }

  // Right claw
  const rcx = bx+26, rcy = by+9-clawRY;
  if (clawROpen) {
    fillRect(rcx-2, rcy-2, 5, 2, ...C.light);
    fillRect(rcx+3, rcy-1, 1, 1, ...C.light);
    fillRect(rcx-2, rcy+1, 5, 2, ...C.body);
    fillRect(rcx+3, rcy+2, 1, 1, ...C.body);
    fillRect(rcx-1, rcy, 3, 1, ...C.dark);
    fillRect(rcx-2, rcy+3, 3, 2, ...C.body);
  } else {
    fillRect(rcx-2, rcy-1, 5, 4, ...C.body);
    fillRect(rcx-1, rcy, 3, 2, ...C.light);
    fillRect(rcx-2, rcy+3, 3, 2, ...C.body);
  }

  // --- Antennae ---
  drawLine(bx+13, by+12, bx+10, by+7, ...C.ant);
  drawLine(bx+10, by+7, bx+7+antW, by+2, ...C.ant);
  setPixel(bx+7+antW, by+1, ...C.ant);
  setPixel(bx+6+antW, by+1, ...C.ant);

  drawLine(bx+19, by+12, bx+22, by+7, ...C.ant);
  drawLine(bx+22, by+7, bx+25-antW, by+2, ...C.ant);
  setPixel(bx+25-antW, by+1, ...C.ant);
  setPixel(bx+26-antW, by+1, ...C.ant);

  // --- Eyes ---
  const ey = by + 14;
  if (eyeOpen) {
    if (eyeType === "angry") {
      fillRect(bx+12+eyeX, ey, 3, 3, ...C.white);
      fillRect(bx+18+eyeX, ey, 3, 3, ...C.white);
      setPixel(bx+13+eyeX, ey+1, ...C.pupil);
      setPixel(bx+19+eyeX, ey+1, ...C.pupil);
      // V brows
      drawLine(bx+11, ey-2, bx+15, ey-1, ...C.pupil);
      drawLine(bx+21, ey-2, bx+17, ey-1, ...C.pupil);
    } else if (eyeType === "sparkle") {
      fillRect(bx+11+eyeX, ey-1, 4, 5, ...C.white);
      fillRect(bx+17+eyeX, ey-1, 4, 5, ...C.white);
      fillRect(bx+12+eyeX, ey+1, 3, 3, ...C.pupil);
      fillRect(bx+18+eyeX, ey+1, 3, 3, ...C.pupil);
      // Big shines
      setPixel(bx+12+eyeX, ey, ...C.shine);
      setPixel(bx+13+eyeX, ey-1, ...C.shine);
      setPixel(bx+18+eyeX, ey, ...C.shine);
      setPixel(bx+19+eyeX, ey-1, ...C.shine);
    } else if (eyeType === "spiral") {
      fillRect(bx+12, ey, 3, 3, ...C.white);
      fillRect(bx+18, ey, 3, 3, ...C.white);
      setPixel(bx+12, ey, ...C.pupil);
      setPixel(bx+14, ey, ...C.pupil);
      setPixel(bx+14, ey+2, ...C.pupil);
      setPixel(bx+12, ey+2, ...C.pupil);
      setPixel(bx+13, ey+1, ...C.pupil);
      setPixel(bx+18, ey, ...C.pupil);
      setPixel(bx+20, ey, ...C.pupil);
      setPixel(bx+20, ey+2, ...C.pupil);
      setPixel(bx+18, ey+2, ...C.pupil);
      setPixel(bx+19, ey+1, ...C.pupil);
    } else {
      // Normal
      fillRect(bx+12+eyeX, ey, 3, 4, ...C.white);
      fillRect(bx+18+eyeX, ey, 3, 4, ...C.white);
      fillRect(bx+13+eyeX, ey+1, 2, 2, ...C.pupil);
      fillRect(bx+19+eyeX, ey+1, 2, 2, ...C.pupil);
      setPixel(bx+12+eyeX, ey, ...C.shine);
      setPixel(bx+18+eyeX, ey, ...C.shine);
    }
  } else {
    // Closed
    fillRect(bx+12, ey+1, 4, 1, ...C.pupil);
    fillRect(bx+18, ey+1, 4, 1, ...C.pupil);
  }

  // --- Blush ---
  if (blush) {
    fillRect(bx+10, by+17, 2, 1, ...C.blushC, 160);
    fillRect(bx+21, by+17, 2, 1, ...C.blushC, 160);
  }

  // --- Mouth ---
  const mx = bx+15, my = by+19;
  switch (mouth) {
    case "happy":
      fillRect(mx, my, 3, 1, ...C.pupil);
      setPixel(mx-1, my-1, ...C.pupil);
      setPixel(mx+3, my-1, ...C.pupil);
      break;
    case "big-happy":
      fillRect(mx-1, my-1, 5, 1, ...C.pupil);
      fillRect(mx, my, 3, 1, ...C.pupil);
      break;
    case "open":
      fillRect(mx, my, 2, 2, ...C.pupil);
      break;
    case "frown":
      fillRect(mx-1, my, 5, 1, ...C.pupil);
      setPixel(mx-1, my-1, ...C.pupil);
      setPixel(mx+3, my-1, ...C.pupil);
      break;
    case "tiny":
      setPixel(mx+1, my, ...C.pupil);
      break;
    case "yawn":
      fillEllipse(mx+1, my+1, 2, 2, ...C.pupil);
      break;
    default:
      fillRect(mx, my, 3, 1, ...C.pupil);
  }
}

// --- Particle effects ---
function sparkle(x, y, c = [255,255,180]) {
  setPixel(x, y, ...c);
  setPixel(x-1, y, c[0], c[1]-60, c[2]-60);
  setPixel(x+1, y, c[0], c[1]-60, c[2]-60);
  setPixel(x, y-1, c[0], c[1]-60, c[2]-60);
  setPixel(x, y+1, c[0], c[1]-60, c[2]-60);
}

function heart(x, y) {
  const c = [255, 90, 120];
  setPixel(x-1, y, ...c); setPixel(x+1, y, ...c);
  setPixel(x-2, y+1, ...c); setPixel(x-1, y+1, ...c);
  setPixel(x, y+1, ...c); setPixel(x+1, y+1, ...c); setPixel(x+2, y+1, ...c);
  setPixel(x-1, y+2, ...c); setPixel(x, y+2, ...c); setPixel(x+1, y+2, ...c);
  setPixel(x, y+3, ...c);
}

function questionMark(x, y) {
  const c = [160, 190, 255];
  fillRect(x, y, 3, 1, ...c);
  setPixel(x+2, y+1, ...c);
  setPixel(x+1, y+2, ...c);
  setPixel(x+1, y+4, ...c);
}

function zzz(x, y, s) {
  const c = [170, 170, 255];
  fillRect(x, y, s, 1, ...c);
  for (let i = 1; i < s; i++) setPixel(x+s-1-Math.floor(i*(s-1)/(s-1)), y+i, ...c);
  fillRect(x, y+s, s, 1, ...c);
}

function steam(x, y) {
  setPixel(x, y, 220, 220, 220, 200);
  setPixel(x+1, y-1, 200, 200, 200, 160);
  setPixel(x-1, y-2, 180, 180, 180, 120);
}

function lightbulb(x, y, on) {
  if (on) {
    fillCircle(x, y, 2, 255, 230, 60);
    setPixel(x, y, 255, 255, 200);
    setPixel(x, y+3, 200, 180, 50);
  } else {
    fillCircle(x, y, 2, 180, 180, 180);
    setPixel(x, y+3, 150, 150, 150);
  }
}

// =============================================
// Generate all animation frames
// =============================================

// Row 0: idle-breathe (4 frames)
for (let f = 0; f < 4; f++) {
  const bounce = [0, -1, 0, 1][f];
  drawLobster(f*W, 0*H, { bounce, clawLY: bounce<0?1:0, clawRY: bounce<0?1:0 });
}

// Row 1: idle-look (4 frames)
for (let f = 0; f < 4; f++) {
  const eyeX = [-1, -1, 1, 0][f];
  drawLobster(f*W, 1*H, { eyeX, antWiggle: eyeX });
}

// Row 2: idle-sleep (4 frames)
for (let f = 0; f < 4; f++) {
  drawLobster(f*W, 2*H, { bounce: 1, eyeOpen: false, mouth: "tiny" });
  if (f >= 1) zzz(f*W+24, 2*H+6-f, 3);
  if (f >= 2) zzz(f*W+27, 2*H+3-(f-1), 2);
}

// Row 3: thinking (4 frames)
for (let f = 0; f < 4; f++) {
  const eyeX = [0, 1, 1, 0][f];
  drawLobster(f*W, 3*H, { eyeX, mouth: "open", clawRY: 2, clawROpen: false });
  lightbulb(f*W+26, 3*H+5+(f%2), f>=2);
}

// Row 4: happy (6 frames)
for (let f = 0; f < 6; f++) {
  const bounce = [0, -1, -3, -2, -1, 0][f];
  drawLobster(f*W, 4*H, {
    bounce, mouth: "big-happy", eyeType: "sparkle", blush: true,
    clawLY: Math.min(f, 3)+1, clawRY: Math.min(f, 3)+1,
  });
  if (f >= 1 && f <= 4) sparkle(f*W+5, 4*H+6);
  if (f >= 2 && f <= 4) sparkle(f*W+27, 4*H+4);
  if (f >= 2 && f <= 3) heart(f*W+16, 4*H+2);
}

// Row 5: confused (4 frames)
for (let f = 0; f < 4; f++) {
  const tilt = [0, 1, 0, -1][f];
  drawLobster(f*W+tilt, 5*H, { eyeType: "spiral", mouth: "open", antWiggle: tilt });
  questionMark(f*W+24, 5*H+4+(f%2));
}

// Row 6: wave (6 frames)
for (let f = 0; f < 6; f++) {
  const clawRY = [0, 2, 4, 3, 1, 0][f];
  drawLobster(f*W, 6*H, {
    mouth: "happy", clawRY, clawROpen: f%2===0, blush: true,
  });
}

// Row 7: angry (6 frames)
for (let f = 0; f < 6; f++) {
  const shake = [0, -1, 1, -1, 1, 0][f];
  drawLobster(f*W+shake, 7*H, {
    eyeType: "angry", mouth: "frown",
    clawLY: 3, clawRY: 3,
  });
  if (f >= 1 && f <= 4) {
    steam(f*W+7+shake, 7*H+5);
    steam(f*W+25+shake, 7*H+4);
  }
}

// Row 8: lazy (4 frames)
for (let f = 0; f < 4; f++) {
  const bounce = [0, 1, 1, 0][f];
  drawLobster(f*W, 8*H, {
    bounce, eyeOpen: false, mouth: f===2?"yawn":"tiny",
    clawLY: -1, clawRY: -1,
  });
}

// =============================================
// Encode PNG
// =============================================
function encodePNG(width, height, pixelData) {
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c>>>1) ^ (c&1 ? 0xedb88320 : 0);
    }
    return (c ^ ~0) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  }
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6;
  const raw = Buffer.alloc(height*(1+width*4));
  for (let y = 0; y < height; y++) {
    raw[y*(1+width*4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y*width+x)*4, di = y*(1+width*4)+1+x*4;
      raw[di]=pixelData[si]; raw[di+1]=pixelData[si+1];
      raw[di+2]=pixelData[si+2]; raw[di+3]=pixelData[si+3];
    }
  }
  return Buffer.concat([sig, chunk("IHDR",ihdr), chunk("IDAT",zlib.deflateSync(raw)), chunk("IEND",Buffer.alloc(0))]);
}

const png = encodePNG(imgW, imgH, pixels);
const path = require("path");
const outPath = path.join(__dirname, "..", "public", "sprites", "spritesheet.png");
fs.writeFileSync(outPath, png);
console.log(`Generated lobster spritesheet (${imgW}x${imgH}, ${png.length} bytes)`);
