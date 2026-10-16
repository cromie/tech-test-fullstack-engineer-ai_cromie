import { Suspense } from "react";
import { Chat } from "@/components/Chat";

export default function ChatPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">AI analyst</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ask the catalog</h1>
      <p className="mb-8 mt-1 text-sm text-ink-2">Answers come from read-only queries against the games database.</p>
      {/* useChat generates random ids on render, so it can't be prerendered (Next 16 cacheComponents). */}
      <Suspense fallback={<p className="text-sm text-ink-3">Loading chat…</p>}>
        <Chat />
      </Suspense>
    </main>
  );
}
