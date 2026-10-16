"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Markdown } from "./Markdown";

const MAX_INPUT_CHARS = 2000;
const TOOL_LABELS: Record<string, string> = {
  "tool-query_games": "Queried games",
  "tool-aggregate_games": "Aggregated games",
  "tool-compare_games": "Compared games",
};

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Try: “Which game made the most revenue last month?”, “How many games are rated above 4?”, or “Compare
            revenue of Rust &amp; Rune vs Neon Courier.”
          </p>
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
                if (part.type in TOOL_LABELS) {
                  return (
                    <p key={i} className="mb-2 text-xs text-zinc-400">
                      ⚙ {TOOL_LABELS[part.type]}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {status === "submitted" && <p className="text-sm text-zinc-400">Thinking…</p>}
        {error && (
          <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
            Something went wrong.{" "}
            <button onClick={() => regenerate()} className="underline">
              Retry
            </button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="sticky bottom-0 flex gap-2 bg-zinc-50 py-3">
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
          <button type="submit" disabled={!input.trim()} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            Send
          </button>
        )}
      </form>
    </div>
  );
}
