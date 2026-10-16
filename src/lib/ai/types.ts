import type { InferUITools, UIMessage } from "ai";
import type { gameTools } from "./tools";

// Type-only import: the client gets typed tool parts without bundling server code.
export type GameTools = InferUITools<typeof gameTools>;
export type ChatMessage = UIMessage<unknown, never, GameTools>;
