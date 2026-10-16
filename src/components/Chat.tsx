"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isStaticToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { Markdown } from "./Markdown";
import { ToolCall } from "./ToolCall";

const MAX_INPUT_CHARS = 2000;
const SUGGESTIONS = [
  "Which game made the most revenue last month?",
  "How many games are rated above 4?",
  "Compare revenue of Rust & Rune vs Neon Courier.",
  "What's the average rating per genre?",
];

/** The API returns `{ error }` JSON on 4xx/5xx; the transport surfaces the raw body as the message. */
function errorText(error: Error) {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {}
  return "Something went wrong.";
}

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, regenerate, setMessages } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
            <p className="mb-4 text-sm text-zinc-500">Ask anything about the catalog, or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-lg bg-zinc-900 px-3 py-2 text-white"
                  : "max-w-full rounded-lg border border-zinc-200 bg-white px-4 py-3"
              }
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                  ) : (
                    <Markdown key={i}>{part.text}</Markdown>
                  );
                }
                if (isStaticToolUIPart(part)) return <ToolCall key={part.toolCallId} part={part} />;
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" /> Thinking…
          </p>
        )}
        {error && (
          <div role="alert" className="flex items-center justify-between rounded bg-red-50 p-3 text-sm text-red-700">
            <span>{errorText(error)}</span>
            <button onClick={() => regenerate()} className="font-medium underline">
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 bg-zinc-50 py-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_INPUT_CHARS}
            placeholder="Ask about revenue, downloads, ratings…"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2"
            aria-label="Message"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded border border-zinc-300 px-4 py-2 text-sm">
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs text-zinc-400">
          <span>
            {messages.length > 0 && !busy && (
              <button type="button" onClick={() => setMessages([])} className="hover:text-zinc-600">
                New conversation
              </button>
            )}
          </span>
          {input.length > MAX_INPUT_CHARS * 0.8 && (
            <span>
              {input.length}/{MAX_INPUT_CHARS}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
