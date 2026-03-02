import { useRef, useEffect, useState } from "react";
import type { PetState, SpriteMeta } from "../shared/types";
import { loadSpriteMeta, getAnimationDef } from "./petAnimations";

const SCALE = 4; // 32px * 4 = 128px rendered size

export function useSpriteAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  state: PetState,
  onAnimationEnd?: () => void
) {
  const [meta, setMeta] = useState<SpriteMeta | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Load sprite meta and image
  useEffect(() => {
    loadSpriteMeta().then(setMeta);
    const img = new Image();
    img.src = "/sprites/spritesheet.png";
    img.onload = () => {
      imageRef.current = img;
    };
    // If image fails to load, we'll use placeholder rendering
    img.onerror = () => {
      imageRef.current = null;
    };
  }, []);

  // Reset frame when state changes
  useEffect(() => {
    frameRef.current = 0;
    lastFrameTimeRef.current = 0;
  }, [state]);

  // Animation loop
  useEffect(() => {
    if (!meta) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animDef = getAnimationDef(meta, state);
    const w = meta.spriteWidth;
    const h = meta.spriteHeight;

    canvas.width = w * SCALE;
    canvas.height = h * SCALE;
    ctx.imageSmoothingEnabled = false;

    const draw = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;

      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed >= animDef.frameInterval) {
        lastFrameTimeRef.current = timestamp;
        const nextFrame = frameRef.current + 1;

        if (nextFrame >= animDef.frames) {
          if (animDef.loop) {
            frameRef.current = 0;
          } else {
            // Animation ended
            onAnimationEnd?.();
            // Stay on last frame
            frameRef.current = animDef.frames - 1;
          }
        } else {
          frameRef.current = nextFrame;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (imageRef.current) {
        // Draw from spritesheet
        const sx = (frameRef.current % meta.cols) * w;
        const sy = animDef.row * h;
        ctx.drawImage(imageRef.current, sx, sy, w, h, 0, 0, w * SCALE, h * SCALE);
      } else {
        // Placeholder: colored circle with state label
        drawPlaceholder(ctx, w * SCALE, h * SCALE, state, frameRef.current);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [meta, state, canvasRef, onAnimationEnd]);
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: PetState,
  frame: number
) {
  const colors: Record<string, string> = {
    "idle-breathe": "#4a9eff",
    "idle-look": "#4a9eff",
    "idle-sleep": "#7a7aff",
    "thinking": "#ffaa00",
    "happy": "#44dd44",
    "confused": "#ff6644",
    "wave": "#ff88cc",
    "angry": "#ff4444",
    "lazy": "#b8a9c9",
  };

  const cx = w / 2;
  const cy = h / 2;
  const breatheOffset = state === "idle-breathe" ? Math.sin(frame * 0.8) * 4 : 0;
  const radius = 40 + breatheOffset;

  // Body
  ctx.fillStyle = colors[state] || "#888";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#fff";
  const eyeOffsetX = state === "idle-look" ? (frame % 2 === 0 ? -4 : 4) : 0;
  ctx.beginPath();
  ctx.arc(cx - 12 + eyeOffsetX, cy - 10, 8, 0, Math.PI * 2);
  ctx.arc(cx + 12 + eyeOffsetX, cy - 10, 8, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = "#333";
  if (state === "idle-sleep" || state === "lazy") {
    // Closed / half-closed eyes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 10);
    ctx.lineTo(cx - 6, cy - 10);
    ctx.moveTo(cx + 6, cy - 10);
    ctx.lineTo(cx + 18, cy - 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 12 + eyeOffsetX, cy - 10, 4, 0, Math.PI * 2);
    ctx.arc(cx + 12 + eyeOffsetX, cy - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    // Angry eyebrows
    if (state === "angry") {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 22);
      ctx.lineTo(cx - 6, cy - 16);
      ctx.moveTo(cx + 18, cy - 22);
      ctx.lineTo(cx + 6, cy - 16);
      ctx.stroke();
    }
  }

  // Mouth varies by state
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (state === "happy") {
    ctx.arc(cx, cy + 8, 12, 0, Math.PI);
  } else if (state === "angry") {
    ctx.arc(cx, cy + 14, 10, Math.PI, 0); // frown
  } else if (state === "lazy") {
    ctx.moveTo(cx - 10, cy + 12);
    ctx.quadraticCurveTo(cx, cy + 8, cx + 10, cy + 12); // sleepy squiggle
  } else if (state === "confused") {
    ctx.moveTo(cx - 8, cy + 12);
    ctx.lineTo(cx + 8, cy + 8);
  } else if (state === "thinking") {
    ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2);
  } else {
    ctx.moveTo(cx - 8, cy + 10);
    ctx.lineTo(cx + 8, cy + 10);
  }
  ctx.stroke();

  // Wave hand
  if (state === "wave") {
    const handAngle = Math.sin(frame * 1.5) * 0.3;
    ctx.save();
    ctx.translate(cx + 35, cy - 20);
    ctx.rotate(handAngle);
    ctx.fillStyle = colors[state];
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // State label
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(state, cx, h - 8);
}
