import { useState, useRef, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { PetState } from "../shared/types";
import { IDLE_STATES, IDLE_CYCLE_MS, SLEEP_TIMEOUT_MS, isIdleState } from "./petAnimations";

export function useAnimationState() {
  const [state, setState] = useState<PetState>("idle-breathe");
  const idleCycleRef = useRef<ReturnType<typeof setInterval>>();
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const idleIndexRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());

  const resetSleepTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      setState("idle-sleep");
    }, SLEEP_TIMEOUT_MS);
  }, []);

  const startIdleCycle = useCallback(() => {
    clearInterval(idleCycleRef.current);
    idleCycleRef.current = setInterval(() => {
      idleIndexRef.current = (idleIndexRef.current + 1) % IDLE_STATES.length;
      setState(IDLE_STATES[idleIndexRef.current]);
    }, IDLE_CYCLE_MS);
  }, []);

  const returnToIdle = useCallback(() => {
    setState("idle-breathe");
    idleIndexRef.current = 0;
    startIdleCycle();
    resetSleepTimer();
  }, [startIdleCycle, resetSleepTimer]);

  const triggerState = useCallback(
    (newState: PetState) => {
      if (isIdleState(newState)) return;
      clearInterval(idleCycleRef.current);
      clearTimeout(sleepTimerRef.current);
      setState(newState);
      resetSleepTimer();

      // For non-looping animations, return to idle after a delay
      // For looping (like thinking), stay until explicitly changed
      const nonLoopDurations: Partial<Record<PetState, number>> = {
        wave: 900,
        happy: 900,
        confused: 800,
      };
      const duration = nonLoopDurations[newState];
      if (duration) {
        setTimeout(returnToIdle, duration);
      }
    },
    [returnToIdle, resetSleepTimer]
  );

  // Initialize idle cycle and sleep timer
  useEffect(() => {
    startIdleCycle();
    resetSleepTimer();
    return () => {
      clearInterval(idleCycleRef.current);
      clearTimeout(sleepTimerRef.current);
    };
  }, [startIdleCycle, resetSleepTimer]);

  // Listen for pet-reaction events from chat window
  useEffect(() => {
    const unlisten = listen<{ state: PetState }>("pet-reaction", (event) => {
      triggerState(event.payload.state);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [triggerState]);

  return { state, triggerState, returnToIdle };
}
