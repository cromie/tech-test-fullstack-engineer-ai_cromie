import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./db";
import { aggregateGames, compareGames, createGame, deleteGame, listGames, queryGames, updateGame } from "./games";
import { aggregateGamesSchema, gameIdSchema, MAX_RESULTS, queryGamesSchema, type GameInput } from "./schema";

const game = (over: Partial<GameInput>): GameInput => ({
  title: "X",
  developer: "Dev",
  genre: "Puzzle",
  monthly_revenue_usd: 1,
  monthly_downloads: 1,
  average_rating: 3,
  ...over,
});

let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
});

describe("queryGames", () => {
  it("finds the top-revenue game", () => {
    const r = queryGames(db, { sort_by: "monthly_revenue_usd", order: "desc", limit: 1 });
    expect(r.games[0].title).toBe("Rust & Rune");
    expect(r.total_matches).toBe(15);
  });

  it("treats gt as strictly greater than", () => {
    const gt = queryGames(db, { filters: { numeric: [{ field: "average_rating", op: "gt", value: 4 }] }, limit: 50 });
    const gte = queryGames(db, { filters: { numeric: [{ field: "average_rating", op: "gte", value: 4 }] }, limit: 50 });
    expect(gt.total_matches).toBe(9);
    expect(gte.total_matches).toBe(11);
  });

  it("caps results at the default limit but reports the total", () => {
    const r = queryGames(db, {});
    expect(r.returned).toBe(10);
    expect(r.total_matches).toBe(15);
  });

  it("filters genre case-insensitively and escapes LIKE wildcards", () => {
    expect(queryGames(db, { filters: { genre: "simulation" } }).total_matches).toBe(3);
    expect(queryGames(db, { filters: { title_contains: "%" } }).total_matches).toBe(0);
  });

  it("rejects non-whitelisted sort columns and oversized limits", () => {
    expect(queryGamesSchema.safeParse({ sort_by: "id; DROP TABLE games" }).success).toBe(false);
    expect(queryGamesSchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

describe("aggregateGames", () => {
  it("counts games rated above 4", () => {
    const r = aggregateGames(db, {
      metric: "count",
      filters: { numeric: [{ field: "average_rating", op: "gt", value: 4 }] },
    });
    expect(r.value).toBe(9);
  });

  it("sums revenue grouped by developer, highest first", () => {
    const r = aggregateGames(db, { metric: "sum", field: "monthly_revenue_usd", group_by: "developer" });
    expect(r.groups?.[0]).toEqual({ group: "Gridline Studio", value: 137000 });
  });

  it("averages rating with rounding", () => {
    const r = aggregateGames(db, { metric: "avg", field: "average_rating", filters: { genre: "Puzzle" } });
    expect(r.value).toBe(4.15);
  });

  it("returns 0 for a sum over no rows, null for avg, and no field for count", () => {
    expect(aggregateGames(db, { metric: "sum", field: "monthly_revenue_usd", filters: { genre: "nope" } }).value).toBe(0);
    expect(aggregateGames(db, { metric: "avg", field: "average_rating", filters: { genre: "nope" } }).value).toBeNull();
    expect(aggregateGames(db, { metric: "count", field: "monthly_revenue_usd" }).field).toBeNull();
  });

  it("caps grouped results and reports the total", () => {
    for (let i = 0; i < 60; i++) createGame(db, game({ title: `G${i}`, developer: `Studio ${i}` }));
    const r = aggregateGames(db, { metric: "count", group_by: "developer" });
    expect(r.groups).toHaveLength(MAX_RESULTS);
    expect(r.total_groups).toBe(68); // 60 new + 8 seed developers
  });

  it("requires a field for non-count metrics", () => {
    expect(aggregateGamesSchema.safeParse({ metric: "sum" }).success).toBe(false);
  });
});

describe("compareGames", () => {
  it("resolves exact and partial titles", () => {
    const r = compareGames(db, { titles: ["hollow tides", "Neon"] });
    expect(r.found.map((g) => [g.title, g.match])).toEqual([
      ["Hollow Tides", "exact"],
      ["Neon Courier", "partial"],
    ]);
    expect(r.not_found).toEqual([]);
  });

  it("reports missing and ambiguous titles instead of guessing", () => {
    const r = compareGames(db, { titles: ["Nonexistent", "Moon"] });
    expect(r.not_found).toEqual(["Nonexistent"]);
    expect(r.found.map((g) => g.title)).toEqual(["Moonwell Farm"]);
    const amb = compareGames(db, { titles: ["Rust & Rune", "a"] });
    expect(amb.ambiguous[0].query).toBe("a");
  });
});

describe("compareGames edge cases", () => {
  it("reports the same game requested twice as a duplicate", () => {
    const r = compareGames(db, { titles: ["Neon Courier", "neon"] });
    expect(r.found).toHaveLength(1);
    expect(r.duplicates).toEqual([{ query: "neon", same_as: "Neon Courier" }]);
  });

  it("returns ambiguous candidates with id and developer, flagging truncation", () => {
    createGame(db, game({ title: "Twin", developer: "A" }));
    createGame(db, game({ title: "Twin", developer: "B" }));
    const twin = compareGames(db, { titles: ["Twin", "Rust & Rune"] }).ambiguous[0];
    expect(twin.candidates.map((c) => c.developer)).toEqual(["A", "B"]);
    expect(twin.truncated).toBe(false);
    expect(compareGames(db, { titles: ["e", "Rust & Rune"] }).ambiguous[0].truncated).toBe(true);
  });
});

describe("ordering and ids", () => {
  it("lists case-insensitively by title", () => {
    createGame(db, game({ title: "aardvark" }));
    expect(listGames(db)[0].title).toBe("aardvark");
  });

  it("breaks ties by id so top-N is deterministic", () => {
    const r = queryGames(db, { filters: { numeric: [{ field: "average_rating", op: "eq", value: 4 }] }, sort_by: "average_rating" });
    expect(r.games.map((g) => g.title)).toEqual(["Starlit Kitchen", "Mire Keeper"]);
  });

  it("accepts only canonical positive integer ids", () => {
    expect(gameIdSchema.safeParse("12").data).toBe(12);
    for (const bad of ["0", "1e0", "0x3", " 3 ", "1.0", "-1", "abc"]) expect(gameIdSchema.safeParse(bad).success).toBe(false);
  });
});

describe("CRUD", () => {
  it("creates, updates and deletes", () => {
    const g = createGame(db, {
      title: "Test",
      developer: "Dev",
      genre: "Puzzle",
      monthly_revenue_usd: 1,
      monthly_downloads: 1,
      average_rating: 3,
    });
    expect(updateGame(db, g.id, { average_rating: 5 })?.average_rating).toBe(5);
    expect(deleteGame(db, g.id)).toBe(true);
    expect(deleteGame(db, g.id)).toBe(false);
    expect(updateGame(db, g.id, { title: "x" })).toBeUndefined();
  });
});
