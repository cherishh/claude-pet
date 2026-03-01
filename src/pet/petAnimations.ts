import type { PetState, AnimationDef, SpriteMeta } from "../shared/types";

let cachedMeta: SpriteMeta | null = null;

export async function loadSpriteMeta(): Promise<SpriteMeta> {
  if (cachedMeta) return cachedMeta;
  const res = await fetch("/sprites/sprite-meta.json");
  cachedMeta = await res.json();
  return cachedMeta!;
}

export const IDLE_STATES: PetState[] = ["idle-breathe", "idle-look"];
export const IDLE_CYCLE_MS = 8000;
export const SLEEP_TIMEOUT_MS = 60000;

export function isIdleState(state: PetState): boolean {
  return state.startsWith("idle-");
}

export function getAnimationDef(
  meta: SpriteMeta,
  state: PetState
): AnimationDef {
  return meta.animations[state];
}
