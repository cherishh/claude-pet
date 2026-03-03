import { useState, useRef, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SpriteMeta } from "../shared/types";
import {
  loadSpriteMeta,
  getIdleStates,
  getSleepState,
  getNonLoopDuration,
  isIdleState,
  IDLE_CYCLE_MS,
  SLEEP_TIMEOUT_MS,
} from "./petAnimations";

export function useAnimationState() {
  const [state, setState] = useState<string>("idle-breathe");
  const [meta, setMeta] = useState<SpriteMeta | null>(null);
  const idleCycleRef = useRef<ReturnType<typeof setInterval>>();
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nonLoopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const idleIndexRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());

  // Load sprite meta on mount
  useEffect(() => {
    loadSpriteMeta().then(setMeta);
  }, []);

  const resetSleepTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      if (meta) {
        const sleep = getSleepState(meta);
        if (sleep) setState(sleep);
      } else {
        setState("idle-sleep");
      }
    }, SLEEP_TIMEOUT_MS);
  }, [meta]);

  const startIdleCycle = useCallback(() => {
    if (!meta) return;
    const idleStates = getIdleStates(meta);
    clearInterval(idleCycleRef.current);
    idleCycleRef.current = setInterval(() => {
      idleIndexRef.current = (idleIndexRef.current + 1) % idleStates.length;
      setState(idleStates[idleIndexRef.current]);
    }, IDLE_CYCLE_MS);
  }, [meta]);

  const returnToIdle = useCallback(() => {
    if (!meta) {
      setState("idle-breathe");
    } else {
      const idleStates = getIdleStates(meta);
      setState(idleStates[0] ?? "idle-breathe");
    }
    idleIndexRef.current = 0;
    startIdleCycle();
    resetSleepTimer();
  }, [meta, startIdleCycle, resetSleepTimer]);

  const triggerState = useCallback(
    (newState: string) => {
      if (meta && isIdleState(meta, newState)) return;
      clearInterval(idleCycleRef.current);
      clearTimeout(sleepTimerRef.current);
      clearTimeout(nonLoopTimerRef.current);
      setState(newState);
      resetSleepTimer();

      // For non-looping animations, return to idle after calculated duration
      if (meta) {
        const animDef = meta.animations[newState];
        if (animDef) {
          const duration = getNonLoopDuration(animDef);
          if (duration) {
            nonLoopTimerRef.current = setTimeout(returnToIdle, duration);
          }
        }
      }
    },
    [meta, returnToIdle, resetSleepTimer]
  );

  // Initialize idle cycle and sleep timer
  useEffect(() => {
    if (!meta) return;
    startIdleCycle();
    resetSleepTimer();
    return () => {
      clearInterval(idleCycleRef.current);
      clearTimeout(sleepTimerRef.current);
      clearTimeout(nonLoopTimerRef.current);
    };
  }, [meta, startIdleCycle, resetSleepTimer]);

  // Listen for pet-reaction events from chat window
  useEffect(() => {
    const unlisten = listen<{ state: string }>("pet-reaction", (event) => {
      triggerState(event.payload.state);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [triggerState]);

  return { state, meta, triggerState, returnToIdle };
}
