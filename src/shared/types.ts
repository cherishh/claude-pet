export type PetState =
  | "idle-breathe"
  | "idle-look"
  | "idle-sleep"
  | "thinking"
  | "happy"
  | "confused"
  | "wave"
  | "angry"
  | "lazy";

export interface AnimationDef {
  row: number;
  frames: number;
  frameInterval: number; // ms per frame
  loop: boolean;
}

export interface SpriteMeta {
  spriteWidth: number;
  spriteHeight: number;
  cols: number;
  animations: Record<PetState, AnimationDef>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface ClaudeStreamEvent {
  type: "textDelta" | "done" | "error";
  text?: string;
  error?: string;
}
