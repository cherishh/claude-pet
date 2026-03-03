import type { AnimationDef, SpriteMeta } from "../shared/types";

let metaPromise: Promise<SpriteMeta> | null = null;

export function loadSpriteMeta(): Promise<SpriteMeta> {
  if (!metaPromise) {
    metaPromise = fetch("/sprites/sprite-meta.json").then((res) => {
      if (!res.ok) throw new Error(`Failed to load sprite-meta.json: ${res.status}`);
      return res.json();
    });
  }
  return metaPromise;
}

export const IDLE_CYCLE_MS = 8000;
export const SLEEP_TIMEOUT_MS = 60000;

export function getIdleStates(meta: SpriteMeta): string[] {
  return Object.entries(meta.animations)
    .filter(([_, def]) => def.category === "idle")
    .map(([name]) => name);
}

export function getSleepState(meta: SpriteMeta): string | null {
  const entry = Object.entries(meta.animations).find(
    ([_, def]) => def.category === "sleep"
  );
  return entry ? entry[0] : null;
}

export function getPokeReactions(meta: SpriteMeta): string[] {
  return Object.entries(meta.animations)
    .filter(([_, def]) => def.category === "poke")
    .map(([name]) => name);
}

export function getNonLoopDuration(def: AnimationDef): number | null {
  return def.loop ? null : def.frames * def.frameInterval;
}

export function isIdleState(meta: SpriteMeta, state: string): boolean {
  const def = meta.animations[state];
  return def?.category === "idle";
}

export function randomPokeReaction(meta: SpriteMeta): string {
  const reactions = getPokeReactions(meta);
  if (reactions.length === 0) {
    const idleStates = getIdleStates(meta);
    return idleStates[0] ?? "idle-breathe";
  }
  return reactions[Math.floor(Math.random() * reactions.length)];
}

export function getAnimationDef(
  meta: SpriteMeta,
  state: string
): AnimationDef | undefined {
  return meta.animations[state];
}
