export type PetState = string;

export type AnimationCategory = "idle" | "sleep" | "poke" | "greet" | "reaction";

export interface AnimationDef {
  row: number;
  frames: number;
  frameInterval: number; // ms per frame
  loop: boolean;
  category: AnimationCategory;
}

export interface SpriteMeta {
  character: { name: string; displaySize: number };
  spriteWidth: number;
  spriteHeight: number;
  cols: number;
  animations: Record<string, AnimationDef>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface AIStreamEvent {
  type: "textDelta" | "done" | "error";
  text?: string;
  error?: string;
}

export interface AIProviderConfig {
  name: string;
  displayName: string;
  binary: string;
  envRemove: string[];
  args: string[];
  streamFormat: string;
  checkCommand: string;
  installUrl: string;
}
