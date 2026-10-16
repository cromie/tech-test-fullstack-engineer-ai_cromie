import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./db";
import { aggregateGames, compareGames, createGame, deleteGame, queryGames, updateGame } from "./games";
import { aggregateGamesSchema, queryGamesSchema } from "./schema";

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

  it("requires a field for non-count metrics", () => {
    expect(aggregateGamesSchema.safeParse({ metric: "sum" }).success).toBe(false);
  });
});

describe("compareGames", () => {
  it("resolves exact and partial titles", () => {
    const r = compareGames(db, { titles: ["hollow tides", "Neon"] });
    expect(r.found.map((g) => g.title)).toEqual(["Hollow Tides", "Neon Courier"]);
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
