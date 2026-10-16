import type { UIMessage } from "ai";
import { MAX_HISTORY_CHARS, MAX_INPUT_CHARS } from "./limits";

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

/**
 * The client owns the history, so anything in it could be forged. Keep only user/assistant text:
 * client-sent tool parts are dropped so the model never treats made-up rows as tool results.
 * It re-queries when it needs data.
 */
export function sanitizeHistory(messages: UIMessage[]): UIMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ id: m.id, role: m.role, parts: m.parts.filter((p) => p.type === "text") }))
    .filter((m) => m.parts.length > 0);
}

/** Returns an error message, or null if the (sanitized) history is acceptable. */
export function checkHistory(messages: UIMessage[]): string | null {
  if (messages.at(-1)?.role !== "user") return "The last message must be from the user";
  if (messages.some((m) => m.role === "user" && textOf(m).length > MAX_INPUT_CHARS)) {
    return `Messages are limited to ${MAX_INPUT_CHARS} characters`;
  }
  if (messages.reduce((n, m) => n + textOf(m).length, 0) > MAX_HISTORY_CHARS) {
    return "This conversation is too long. Start a new conversation.";
  }
  return null;
}
