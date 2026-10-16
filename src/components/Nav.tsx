import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
        <span className="font-semibold">Indie Games</span>
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">Dashboard</Link>
        <Link href="/chat" className="text-zinc-600 hover:text-zinc-900">Chat</Link>
      </nav>
    </header>
  );
}
