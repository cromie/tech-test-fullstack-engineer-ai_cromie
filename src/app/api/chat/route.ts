import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { CHAT_INSTRUCTIONS } from "@/lib/ai/instructions";
import { CHAT_RATE_LIMIT, MAX_MESSAGES } from "@/lib/ai/limits";
import { chatModel } from "@/lib/ai/model";
import { checkHistory, sanitizeHistory } from "@/lib/ai/request";
import { gameTools } from "@/lib/ai/tools";
import { jsonError } from "@/lib/http";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const bodySchema = z.object({ messages: z.array(z.unknown()).min(1) });

// One limiter per server process; survives dev hot reloads.
const globalForLimiter = globalThis as unknown as { chatLimiter?: ReturnType<typeof createRateLimiter> };
const rateLimit = (globalForLimiter.chatLimiter ??= createRateLimiter(CHAT_RATE_LIMIT));

export async function POST(req: Request) {
  // Checked first: rejected requests cost nothing, but every accepted one spends API credits.
  const limited = rateLimit(clientKey(req));
  if (!limited.ok) {
    const res = jsonError(429, `Too many requests. Try again in ${limited.retryAfterSec}s.`);
    res.headers.set("Retry-After", String(limited.retryAfterSec));
    return res;
  }

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "Invalid request");
  if (body.data.messages.length > MAX_MESSAGES) {
    return jsonError(400, "This conversation is too long. Start a new conversation.");
  }

  const validated = await safeValidateUIMessages({ messages: body.data.messages, tools: gameTools });
  if (!validated.success) return jsonError(400, "Invalid messages");
  // Only user/assistant turns; system prompts come from the server alone.
  if (validated.data.some((m) => m.role === "system")) return jsonError(400, "System messages are not allowed");

  const messages = sanitizeHistory(validated.data);
  const problem = checkHistory(messages);
  if (problem) return jsonError(400, problem);

  if (!process.env.ANTHROPIC_API_KEY) return jsonError(500, "ANTHROPIC_API_KEY is not configured on the server");

  const result = streamText({
    model: chatModel(),
    instructions: CHAT_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    tools: gameTools,
    stopWhen: isStepCount(5),
    maxOutputTokens: 1024,
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools: gameTools,
      originalMessages: validated.data,
      onError: (error) => {
        console.error("[chat]", error);
        return "Something went wrong while answering. Please try again.";
      },
    }),
  });
}
