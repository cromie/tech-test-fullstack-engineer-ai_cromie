"use client";

import { useState } from "react";
import { GameForm } from "./GameForm";
import { int, usd } from "@/lib/format";
import type { Game, GameInput } from "@/lib/schema";

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Matches the server's `ORDER BY title COLLATE NOCASE, id`.
const byTitle = (a: Game, b: Game) =>
  a.title.toLowerCase() < b.title.toLowerCase() ? -1 : a.title.toLowerCase() > b.title.toLowerCase() ? 1 : a.id - b.id;

export function GamesManager({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState(initialGames);
  const [editing, setEditing] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(input: GameInput) {
    setError(null);
    try {
      if (editing) {
        const updated = await request<Game>(`/api/games/${editing.id}`, { method: "PATCH", body: JSON.stringify(input) });
        setGames((gs) => gs.map((g) => (g.id === updated.id ? updated : g)).sort(byTitle));
        setEditing(null);
      } else {
        const created = await request<Game>("/api/games", { method: "POST", body: JSON.stringify(input) });
        setGames((gs) => [...gs, created].sort(byTitle));
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  async function remove(game: Game) {
    if (!confirm(`Delete "${game.title}"?`)) return;
    setError(null);
    try {
      await request<void>(`/api/games/${game.id}`, { method: "DELETE" });
      setGames((gs) => gs.filter((g) => g.id !== game.id));
      if (editing?.id === game.id) setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <p className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">{games.length} games</p>
        {games.length === 0 ? (
          <p className="p-6 text-center text-zinc-500">No games yet. Add one with the form.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Developer</th>
                <th className="px-3 py-2">Genre</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Revenue / mo</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Downloads / mo</th>
                <th className="px-3 py-2 text-right">Rating</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id} className={`border-b border-zinc-100 last:border-0 ${editing?.id === g.id ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-2 font-medium">{g.title}</td>
                  <td className="whitespace-nowrap px-3 py-2">{g.developer}</td>
                  <td className="whitespace-nowrap px-3 py-2">{g.genre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{usd(g.monthly_revenue_usd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{int(g.monthly_downloads)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.average_rating.toFixed(1)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button onClick={() => setEditing(g)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => remove(g)} className="ml-3 text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <aside className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">{editing ? `Edit “${editing.title}”` : "Add a game"}</h2>
        {error && <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <GameForm key={editing?.id ?? "new"} initial={editing} onSubmit={save} onCancel={editing ? () => setEditing(null) : undefined} />
      </aside>
    </div>
  );
}
