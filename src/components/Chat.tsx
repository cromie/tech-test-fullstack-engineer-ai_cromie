"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isStaticToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import { MAX_INPUT_CHARS } from "@/lib/ai/limits";
import type { ChatMessage } from "@/lib/ai/types";
import { Markdown } from "./Markdown";
import { ToolCall } from "./ToolCall";

const SUGGESTIONS = [
  "Which game made the most revenue last month?",
  "How many games are rated above 4?",
  "Compare revenue of Rust & Rune vs Neon Courier.",
  "What's the average rating per genre?",
];

/** The API returns `{ error }` JSON for rejected requests; the transport surfaces the raw body as the message. */
function apiError(error: Error): string | null {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {}
  return null;
}

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, regenerate, setMessages, clearError } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);
  // Rejected requests (4xx with a message) fail the same way on retry; only offer Retry for other failures.
  const rejection = error ? apiError(error) : null;

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
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <p className="mb-5 text-sm text-ink-2">Ask anything about the catalog, or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-sm text-ink-2 transition hover:border-accent/60 hover:text-ink"
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
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white shadow-lg shadow-accent/15"
                  : "max-w-full rounded-2xl rounded-bl-md border border-line bg-surface px-5 py-4 text-ink"
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
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Thinking…
          </p>
        )}
        {error && (
          <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <span>{rejection ?? "Something went wrong."}</span>
            {!rejection && messages.length > 0 && (
              <button onClick={() => regenerate()} className="font-medium underline">
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 bg-canvas/90 py-4 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_INPUT_CHARS}
            placeholder="Ask about revenue, downloads, ratings…"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/20"
            aria-label="Message"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded-xl border border-line px-5 py-3 text-sm text-ink-2 hover:text-ink">
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              Send
            </button>
          )}
        </div>
        <div className="mt-1.5 flex justify-between px-1 text-xs text-ink-3">
          <span>
            {(messages.length > 0 || error) && !busy && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  clearError();
                }}
                className="hover:text-ink"
              >
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
