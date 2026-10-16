import { Chat } from "@/components/Chat";

export default function ChatPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Ask the catalog</h1>
      <p className="mb-6 text-sm text-zinc-500">Answers come from read-only queries against the games database.</p>
      <Chat />
    </main>
  );
}
