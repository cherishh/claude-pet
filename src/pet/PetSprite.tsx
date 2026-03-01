import { useRef } from "react";
import type { PetState } from "../shared/types";
import { useSpriteAnimation } from "./useSpriteAnimation";

interface PetSpriteProps {
  state: PetState;
}

export function PetSprite({ state }: PetSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSpriteAnimation(canvasRef, state);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        width: 128,
        height: 128,
      }}
    />
  );
}
