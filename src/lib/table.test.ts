import { describe, expect, it } from "vitest";
import { SEED_GAMES } from "./db/seed-data";
import type { Game } from "./schema";
import { DEFAULT_VIEW, filterAndSort, genresOf, nextSort } from "./table";

const games: Game[] = SEED_GAMES.map((g, i) => ({ ...g, id: i + 1 }));
const titles = (gs: Game[]) => gs.map((g) => g.title);

describe("filterAndSort", () => {
  it("defaults to title A→Z", () => {
    const r = filterAndSort(games, DEFAULT_VIEW);
    expect(r[0].title).toBe("Cosmic Crumbs");
    expect(r).toHaveLength(15);
  });

  it("sorts numbers both ways, with a stable tie-break", () => {
    const desc = filterAndSort(games, { ...DEFAULT_VIEW, sortKey: "monthly_revenue_usd", sortDir: "desc" });
    expect(desc[0].title).toBe("Rust & Rune");
    const byRating = filterAndSort(games, { ...DEFAULT_VIEW, sortKey: "average_rating", sortDir: "asc" });
    // 4.0 tie (Mire Keeper, Starlit Kitchen) is broken by title
    expect(titles(byRating.filter((g) => g.average_rating === 4))).toEqual(["Mire Keeper", "Starlit Kitchen"]);
  });

  it("searches title and developer, case-insensitively", () => {
    expect(titles(filterAndSort(games, { ...DEFAULT_VIEW, query: "  RUNE " }))).toEqual(["Rust & Rune"]);
    expect(filterAndSort(games, { ...DEFAULT_VIEW, query: "sprout" })).toHaveLength(3);
  });

  it("combines genre filter with search", () => {
    expect(filterAndSort(games, { ...DEFAULT_VIEW, genre: "Simulation" })).toHaveLength(3);
    expect(titles(filterAndSort(games, { ...DEFAULT_VIEW, genre: "Simulation", query: "farm" }))).toEqual(["Moonwell Farm"]);
    expect(filterAndSort(games, { ...DEFAULT_VIEW, genre: "Puzzle", query: "rune" })).toEqual([]);
  });

  it("does not mutate the input", () => {
    const copy = [...games];
    filterAndSort(games, { ...DEFAULT_VIEW, sortKey: "monthly_downloads", sortDir: "desc" });
    expect(games).toEqual(copy);
  });
});

describe("nextSort", () => {
  it("starts numbers high-to-low and text A→Z, then toggles", () => {
    expect(nextSort(DEFAULT_VIEW, "monthly_revenue_usd")).toEqual({ sortKey: "monthly_revenue_usd", sortDir: "desc" });
    expect(nextSort(DEFAULT_VIEW, "title")).toEqual({ sortKey: "title", sortDir: "desc" });
    expect(nextSort({ ...DEFAULT_VIEW, sortKey: "genre", sortDir: "desc" }, "genre").sortDir).toBe("asc");
  });
});

it("lists distinct genres alphabetically", () => {
  expect(genresOf(games)).toHaveLength(11);
  expect(genresOf(games)[0]).toBe("Action");
});
