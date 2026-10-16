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
import { MAX_MESSAGES } from "@/lib/ai/limits";
import { chatModel } from "@/lib/ai/model";
import { checkHistory, sanitizeHistory } from "@/lib/ai/request";
import { gameTools } from "@/lib/ai/tools";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({ messages: z.array(z.unknown()).min(1) });

export async function POST(req: Request) {
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
