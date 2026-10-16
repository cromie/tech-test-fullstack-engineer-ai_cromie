"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameForm } from "./GameForm";
import { Cover, GenrePill, RevenueBar, Stars } from "./GameVisuals";
import { StatTiles } from "./StatTiles";
import { int } from "@/lib/format";
import { DEFAULT_VIEW, filterAndSort, genresOf, nextSort, type SortKey, type TableView } from "@/lib/table";
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
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TableView>(DEFAULT_VIEW);
  // Bumped when a save/delete starts and when it finishes. A refresh that started under an older
  // value may carry a snapshot from before that change, so its response is discarded.
  const changeVersion = useRef(0);

  const visible = useMemo(() => filterAndSort(games, view), [games, view]);
  const genres = useMemo(() => genresOf(games), [games]);
  const filtered = view.query.trim() !== "" || view.genre !== null;
  const sortBy = (key: SortKey) => setView((v) => ({ ...v, ...nextSort(v, key) }));

  // Pick up changes made elsewhere (another tab, the API) when the user comes back to this tab.
  useEffect(() => {
    let inFlight = false;
    async function refresh() {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      const startedAt = changeVersion.current;
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        if (!res.ok) return;
        const fresh: Game[] = await res.json();
        if (changeVersion.current !== startedAt) return; // a local change overlapped: this snapshot may be stale
        setGames(fresh.sort(byTitle));
        // Keep an open edit (same id keeps the form's in-progress input); close it if the game is gone.
        setEditing((e) => (e ? (fresh.find((g) => g.id === e.id) ?? null) : null));
      } catch {
        // offline or server restarting: keep showing what we have
      } finally {
        inFlight = false;
      }
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const maxRevenue = Math.max(0, ...games.map((g) => g.monthly_revenue_usd));

  async function save(input: GameInput) {
    setError(null);
    changeVersion.current++;
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
    } finally {
      changeVersion.current++;
    }
  }

  async function remove(game: Game) {
    setError(null);
    changeVersion.current++;
    try {
      await request<void>(`/api/games/${game.id}`, { method: "DELETE" });
      setGames((gs) => gs.filter((g) => g.id !== game.id));
      if (editing?.id === game.id) setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      changeVersion.current++;
      setConfirmingDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <StatTiles games={games} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <h2 className="mr-auto text-sm font-medium">Library</h2>
            <label className="relative w-full sm:w-auto">
              <span className="sr-only">Search games</span>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={view.query}
                onChange={(e) => setView((v) => ({ ...v, query: e.target.value }))}
                placeholder="Search title or developer"
                className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-8 pr-3 text-sm sm:w-56 text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label>
              <span className="sr-only">Filter by genre</span>
              <select
                value={view.genre ?? ""}
                onChange={(e) => setView((v) => ({ ...v, genre: e.target.value || null }))}
                className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="">All genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs tabular-nums text-ink-3" aria-live="polite">
              {filtered ? `${visible.length} of ${games.length}` : `${games.length} games`}
            </span>
          </div>
          {games.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">No games yet</p>
              <p className="mt-1 text-sm text-ink-3">Add the first one with the form.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">No games match</p>
              <button
                onClick={() => setView((v) => ({ ...v, query: "", genre: null }))}
                className="mt-2 text-sm text-accent hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              {/* relative: absolutely positioned children (sr-only labels) are clipped here instead of widening the page */}
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-3">
                  <tr className="border-b border-line">
                    <SortHeader label="Game" sortKey="title" view={view} onSort={sortBy} />
                    <SortHeader label="Genre" sortKey="genre" view={view} onSort={sortBy} className="hidden md:table-cell" />
                    <SortHeader label="Revenue / mo" sortKey="monthly_revenue_usd" view={view} onSort={sortBy} align="right" />
                    <SortHeader label="Downloads" sortKey="monthly_downloads" view={view} onSort={sortBy} align="right" className="hidden sm:table-cell" />
                    <SortHeader label="Rating" sortKey="average_rating" view={view} onSort={sortBy} />
                    <th className="py-2.5 pl-2 pr-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((g) => (
                    <tr
                      key={g.id}
                      className={`group border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2 ${
                        editing?.id === g.id ? "bg-accent/10" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Cover title={g.title} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{g.title}</p>
                            <p className="truncate text-xs text-ink-3">{g.developer}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        <GenrePill genre={g.genre} />
                      </td>
                      <td className="px-4 py-2.5">
                        <RevenueBar value={g.monthly_revenue_usd} max={maxRevenue} />
                      </td>
                      <td className="hidden px-4 py-2.5 text-right tabular-nums text-ink-2 sm:table-cell">{int(g.monthly_downloads)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Stars rating={g.average_rating} />
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-2 pr-3 text-right">
                        {confirmingDelete === g.id ? (
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span className="text-ink-2">Delete?</span>
                            <button
                              onClick={() => remove(g)}
                              className="rounded-md bg-danger/15 px-2 py-1 font-medium text-danger hover:bg-danger/25"
                            >
                              Yes
                            </button>
                            <button onClick={() => setConfirmingDelete(null)} className="rounded-md px-2 py-1 text-ink-2 hover:text-ink">
                              No
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-0.5 opacity-50 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <IconButton label={`Edit ${g.title}`} onClick={() => setEditing(g)}>
                              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </IconButton>
                            <IconButton label={`Delete ${g.title}`} onClick={() => setConfirmingDelete(g.id)} danger>
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                            </IconButton>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-3">
            {editing && <Cover title={editing.title} size="lg" />}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-ink-3">{editing ? "Editing" : "New game"}</p>
              <h2 className="truncate font-semibold">{editing ? editing.title : "Add to the catalog"}</h2>
            </div>
          </div>
          {error && (
            <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <GameForm
            key={editing?.id ?? "new"}
            initial={editing}
            onSubmit={save}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </aside>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors ${
        danger ? "hover:bg-danger/15 hover:text-danger" : "hover:bg-line hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  view,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  view: TableView;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = view.sortKey === sortKey;
  return (
    <th
      aria-sort={active ? (view.sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : ""} ${className}`}
    >
      <button
        onClick={() => onSort(sortKey)}
        className={`group/sort inline-flex items-center gap-1 whitespace-nowrap rounded transition-colors hover:text-ink ${
          active ? "text-ink" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <span aria-hidden className={`text-[10px] ${active ? "text-accent" : "opacity-0 group-hover/sort:opacity-50"}`}>
          {active && view.sortDir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}
