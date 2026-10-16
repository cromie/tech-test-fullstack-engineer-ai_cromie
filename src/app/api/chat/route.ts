import { anthropic } from "@ai-sdk/anthropic";
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
import { gameTools } from "@/lib/ai/tools";
import { jsonError } from "@/lib/http";

const MAX_MESSAGES = 30;
const MAX_INPUT_CHARS = 2000;

const bodySchema = z.object({ messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES) });

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, `Send 1–${MAX_MESSAGES} messages`);

  const validated = await safeValidateUIMessages({ messages: body.data.messages, tools: gameTools });
  if (!validated.success) return jsonError(400, "Invalid messages");
  const messages = validated.data;

  // Only user/assistant turns; system prompts come from the server alone.
  if (messages.some((m) => m.role === "system")) return jsonError(400, "System messages are not allowed");
  const tooLong = messages.some(
    (m) => m.role === "user" && m.parts.some((p) => p.type === "text" && p.text.length > MAX_INPUT_CHARS),
  );
  if (tooLong) return jsonError(400, `Messages are limited to ${MAX_INPUT_CHARS} characters`);

  if (!process.env.ANTHROPIC_API_KEY) return jsonError(500, "ANTHROPIC_API_KEY is not configured on the server");

  const result = streamText({
    model: anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5"),
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
      originalMessages: messages,
      onError: (error) => {
        console.error("[chat]", error);
        return "Something went wrong while answering. Please try again.";
      },
    }),
  });
}
