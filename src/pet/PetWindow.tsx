import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PetSprite } from "./PetSprite";
import { useAnimationState } from "./useAnimationState";

export function PetWindow() {
  const { state, triggerState } = useAnimationState();

  // Default: click-through enabled. Sprite area handles mouse events.
  useEffect(() => {
    invoke("set_click_through", { ignore: true }).catch(console.error);
  }, []);

  const handleMouseEnter = useCallback(() => {
    invoke("set_click_through", { ignore: false }).catch(console.error);
  }, []);

  const handleMouseLeave = useCallback(() => {
    invoke("set_click_through", { ignore: true }).catch(console.error);
  }, []);

  const handleClick = useCallback(() => {
    triggerState("wave");
    invoke("toggle_chat_window").catch(console.error);
  }, [triggerState]);

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      >
        <PetSprite state={state} />
      </div>
    </div>
  );
}
