import { useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { load } from "@tauri-apps/plugin-store";
import { PetSprite } from "./PetSprite";
import { useAnimationState } from "./useAnimationState";
import { randomPokeReaction } from "./petAnimations";

const DOUBLE_CLICK_THRESHOLD = 300; // ms

export function PetWindow() {
  const { state, meta, triggerState } = useAnimationState();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isDraggingRef = useRef(false);

  // Restore saved position on mount
  useEffect(() => {
    (async () => {
      try {
        const store = await load("pet-state.json");
        const x = await store.get<number>("x");
        const y = await store.get<number>("y");
        if (x != null && y != null) {
          await getCurrentWindow().setPosition(
            new (await import("@tauri-apps/api/dpi")).PhysicalPosition(x, y)
          );
        }
      } catch {
        // First launch, no saved position
      }
    })();
  }, []);

  // Save position when window moves
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout>;
    const unlisten = getCurrentWindow().onMoved(async (e) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const store = await load("pet-state.json");
          await store.set("x", e.payload.x);
          await store.set("y", e.payload.y);
          await store.save();
        } catch {
          // ignore save errors
        }
      }, 500);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = false;

    const startX = e.screenX;
    const startY = e.screenY;

    const onMove = (me: MouseEvent) => {
      if (Math.abs(me.screenX - startX) > 3 || Math.abs(me.screenY - startY) > 3) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          getCurrentWindow().startDragging();
        }
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const handleClick = useCallback(() => {
    if (isDraggingRef.current) return;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = undefined;
      triggerState("wave");
      invoke("toggle_chat_window").catch(console.error);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = undefined;
        if (meta) {
          triggerState(randomPokeReaction(meta));
        }
      }, DOUBLE_CLICK_THRESHOLD);
    }
  }, [triggerState, meta]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{ cursor: "grab" }}
      >
        <PetSprite state={state} meta={meta} />
      </div>
    </div>
  );
}
