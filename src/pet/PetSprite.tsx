import { useRef } from "react";
import type { SpriteMeta } from "../shared/types";
import { useSpriteAnimation } from "./useSpriteAnimation";

interface PetSpriteProps {
  state: string;
  meta: SpriteMeta | null;
}

export function PetSprite({ state, meta }: PetSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSpriteAnimation(canvasRef, state, meta);

  const size = meta?.character.displaySize ?? 128;

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        width: size,
        height: size,
      }}
    />
  );
}
