import type { Game } from "./schema";

export const SORT_KEYS = ["title", "genre", "monthly_revenue_usd", "monthly_downloads", "average_rating"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export type TableView = { query: string; genre: string | null; sortKey: SortKey; sortDir: SortDir };

export const DEFAULT_VIEW: TableView = { query: "", genre: null, sortKey: "title", sortDir: "asc" };

const isText = (key: SortKey) => key === "title" || key === "genre";

/** Numbers start high-to-low ("who's on top?"), text starts A→Z. */
export const firstDir = (key: SortKey): SortDir => (isText(key) ? "asc" : "desc");

/** Clicking the active column flips direction; clicking another column starts at its natural direction. */
export function nextSort(view: TableView, key: SortKey): Pick<TableView, "sortKey" | "sortDir"> {
  if (view.sortKey !== key) return { sortKey: key, sortDir: firstDir(key) };
  return { sortKey: key, sortDir: view.sortDir === "asc" ? "desc" : "asc" };
}

export function genresOf(games: Game[]): string[] {
  return [...new Set(games.map((g) => g.genre))].sort((a, b) => a.localeCompare(b));
}

export function filterAndSort(games: Game[], view: TableView): Game[] {
  const q = view.query.trim().toLowerCase();
  const sign = view.sortDir === "asc" ? 1 : -1;
  return games
    .filter((g) => !view.genre || g.genre === view.genre)
    .filter((g) => !q || g.title.toLowerCase().includes(q) || g.developer.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = a[view.sortKey];
      const y = b[view.sortKey];
      const cmp = typeof x === "string" ? x.localeCompare(y as string, undefined, { sensitivity: "base" }) : x - (y as number);
      return cmp * sign || a.title.localeCompare(b.title) || a.id - b.id; // stable tie-break
    });
}
