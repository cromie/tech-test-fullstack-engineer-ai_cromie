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
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Games catalog</h1>
      <Suspense fallback={<TableSkeleton />}>
        <Games />
      </Suspense>
    </main>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-6 animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
