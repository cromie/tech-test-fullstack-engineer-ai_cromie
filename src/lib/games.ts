import { and, asc, count, desc, eq, gt, gte, lt, lte, sql, type Column, type SQL } from "drizzle-orm";
import type { Db } from "./db";
import { gamesTable } from "./db/table";
import { MAX_RESULTS } from "./schema";
import type {
  AggregateGamesInput,
  CompareGamesInput,
  Filters,
  Game,
  GameInput,
  GameUpdate,
  QueryGamesInput,
} from "./schema";

// ---- CRUD ----

export function listGames(db: Db): Game[] {
  return db.select().from(gamesTable).orderBy(sql`${gamesTable.title} COLLATE NOCASE`, asc(gamesTable.id)).all();
}

export function getGame(db: Db, id: number): Game | undefined {
  return db.select().from(gamesTable).where(eq(gamesTable.id, id)).get();
}

export function createGame(db: Db, input: GameInput): Game {
  return db.insert(gamesTable).values(input).returning().get();
}

export function updateGame(db: Db, id: number, input: GameUpdate): Game | undefined {
  return db.update(gamesTable).set(input).where(eq(gamesTable.id, id)).returning().get();
}

export function deleteGame(db: Db, id: number): boolean {
  return db.delete(gamesTable).where(eq(gamesTable.id, id)).run().changes > 0;
}

// ---- Read-only queries used by the AI tools ----

const DEFAULT_LIMIT = 10;
const OPS = { gt, gte, lt, lte, eq } as const;

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function ciEquals(column: Column, value: string) {
  return sql`lower(${column}) = lower(${value.trim()})`;
}

function titleContains(value: string) {
  return sql`${gamesTable.title} LIKE ${`%${escapeLike(value.trim())}%`} ESCAPE '\\'`;
}

function buildWhere(filters: Filters | undefined): SQL | undefined {
  if (!filters) return undefined;
  const conditions: SQL[] = [];
  if (filters.genre) conditions.push(ciEquals(gamesTable.genre, filters.genre));
  if (filters.developer) conditions.push(ciEquals(gamesTable.developer, filters.developer));
  if (filters.title_contains) conditions.push(titleContains(filters.title_contains));
  for (const c of filters.numeric ?? []) conditions.push(OPS[c.op](gamesTable[c.field], c.value));
  return conditions.length ? and(...conditions) : undefined;
}

export function queryGames(db: Db, input: QueryGamesInput) {
  const where = buildWhere(input.filters);
  const sortColumn = gamesTable[input.sort_by ?? "title"];
  const order = input.order === "desc" ? desc(sortColumn) : asc(sortColumn);
  const limit = input.limit ?? DEFAULT_LIMIT;

  // id tie-break keeps "top N" deterministic when values are equal
  const games = db.select().from(gamesTable).where(where).orderBy(order, asc(gamesTable.id)).limit(limit).all();
  const total = db.select({ n: count() }).from(gamesTable).where(where).get()?.n ?? 0;
  return { total_matches: total, returned: games.length, games };
}

export function aggregateGames(db: Db, input: AggregateGamesInput) {
  const where = buildWhere(input.filters);
  const fn = input.metric;
  const field = fn === "count" ? null : input.field!;
  // fn comes from a zod enum, never free text. sum of no rows is 0, not null; avg/min/max stay null.
  const value =
    field === null
      ? sql<number>`count(*)`
      : fn === "sum"
        ? sql<number>`coalesce(sum(${gamesTable[field]}), 0)`
        : sql<number>`${sql.raw(fn)}(${gamesTable[field]})`;

  if (!input.group_by) {
    const row = db.select({ value }).from(gamesTable).where(where).get();
    return { metric: fn, field, value: round(row?.value ?? null) };
  }

  const groupColumn = gamesTable[input.group_by];
  const rows = db
    .select({ group: groupColumn, value })
    .from(gamesTable)
    .where(where)
    .groupBy(groupColumn)
    .orderBy(desc(value), asc(groupColumn))
    .all();
  return {
    metric: fn,
    field,
    group_by: input.group_by,
    total_groups: rows.length,
    groups: rows.slice(0, MAX_RESULTS).map((r) => ({ group: r.group, value: round(r.value) })),
  };
}

/** Resolves each title (exact match first, then substring) and returns the matched games side by side. Results are final: not_found means no title contains the query. */
export function compareGames(db: Db, input: CompareGamesInput) {
  const MAX_CANDIDATES = 5;
  const found: (Game & { query: string; match: "exact" | "partial" })[] = [];
  const not_found: string[] = [];
  const duplicates: { query: string; same_as: string }[] = [];
  const ambiguous: { query: string; candidates: Pick<Game, "id" | "title" | "developer">[]; truncated: boolean }[] = [];

  for (const query of input.titles) {
    const exact = db.select().from(gamesTable).where(ciEquals(gamesTable.title, query)).all();
    const matches = exact.length
      ? exact
      : db.select().from(gamesTable).where(titleContains(query)).orderBy(asc(gamesTable.id)).limit(MAX_CANDIDATES + 1).all();

    if (matches.length === 0) {
      not_found.push(query);
    } else if (matches.length === 1) {
      const prior = found.find((g) => g.id === matches[0].id);
      if (prior) duplicates.push({ query, same_as: prior.query });
      else found.push({ ...matches[0], query, match: exact.length ? "exact" : "partial" });
    } else {
      ambiguous.push({
        query,
        candidates: matches.slice(0, MAX_CANDIDATES).map(({ id, title, developer }) => ({ id, title, developer })),
        truncated: matches.length > MAX_CANDIDATES,
      });
    }
  }
  return { found, not_found, duplicates, ambiguous };
}

function round(n: number | null) {
  return n === null ? null : Math.round(n * 100) / 100;
}
