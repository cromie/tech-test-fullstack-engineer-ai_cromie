import { Suspense } from "react";
import { connection } from "next/server";
import { GamesManager } from "@/components/GamesManager";
import { getDb } from "@/lib/db";
import { listGames } from "@/lib/games";

async function Games() {
  await connection(); // read the DB per request, not at build time
  return <GamesManager initialGames={listGames(getDb())} />;
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Internal dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Games catalog</h1>
        <p className="mt-1 text-sm text-ink-2">Monthly performance across the indie portfolio.</p>
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <Games />
      </Suspense>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
