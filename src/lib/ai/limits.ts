// Shared by the chat route and the chat UI.
export const MAX_MESSAGES = 30;
export const MAX_INPUT_CHARS = 2000; // per user message, summed over its text parts
export const MAX_HISTORY_CHARS = 20_000; // whole conversation, all roles
export const CHAT_RATE_LIMIT = { limit: Number(process.env.CHAT_RATE_LIMIT_PER_MIN) || 20, windowMs: 60_000 };
