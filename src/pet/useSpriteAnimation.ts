import { useRef, useEffect } from "react";
import type { SpriteMeta, AnimationCategory } from "../shared/types";
import { getAnimationDef } from "./petAnimations";

export function useSpriteAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  state: string,
  meta: SpriteMeta | null,
  onAnimationEnd?: () => void
) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Load sprite image
  useEffect(() => {
    const img = new Image();
    img.src = "/sprites/spritesheet.png";
    img.onload = () => {
      imageRef.current = img;
    };
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
    if (!animDef) return;

    const w = meta.spriteWidth;
    const h = meta.spriteHeight;
    const scale = meta.character.displaySize / w;

    canvas.width = w * scale;
    canvas.height = h * scale;
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
            onAnimationEnd?.();
            frameRef.current = animDef.frames - 1;
          }
        } else {
          frameRef.current = nextFrame;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (imageRef.current) {
        const sx = (frameRef.current % meta.cols) * w;
        const sy = animDef.row * h;
        ctx.drawImage(imageRef.current, sx, sy, w, h, 0, 0, w * scale, h * scale);
      } else {
        drawPlaceholder(ctx, w * scale, h * scale, state, animDef.category, frameRef.current);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [meta, state, canvasRef, onAnimationEnd]);
}

const categoryColors: Record<AnimationCategory, string> = {
  idle: "#4a9eff",
  sleep: "#7a7aff",
  poke: "#ff6644",
  greet: "#ff88cc",
  reaction: "#ffaa00",
};

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: string,
  category: AnimationCategory,
  frame: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const breatheOffset = category === "idle" ? Math.sin(frame * 0.8) * 4 : 0;
  const radius = 40 + breatheOffset;

  // Body
  ctx.fillStyle = categoryColors[category] || "#888";
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
  if (category === "sleep") {
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
  }

  // Mouth
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (category === "poke" || category === "greet") {
    ctx.arc(cx, cy + 8, 12, 0, Math.PI); // smile
  } else if (category === "reaction") {
    ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2); // "o" mouth
  } else {
    ctx.moveTo(cx - 8, cy + 10);
    ctx.lineTo(cx + 8, cy + 10); // neutral
  }
  ctx.stroke();

  // Wave hand for greet
  if (category === "greet") {
    const handAngle = Math.sin(frame * 1.5) * 0.3;
    ctx.save();
    ctx.translate(cx + 35, cy - 20);
    ctx.rotate(handAngle);
    ctx.fillStyle = categoryColors[category];
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
