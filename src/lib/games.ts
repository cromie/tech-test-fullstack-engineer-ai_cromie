import { and, asc, count, desc, eq, gt, gte, lt, lte, sql, type Column, type SQL } from "drizzle-orm";
import type { Db } from "./db";
import { gamesTable } from "./db/table";
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
  return db.select().from(gamesTable).orderBy(asc(gamesTable.title)).all();
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

  const games = db.select().from(gamesTable).where(where).orderBy(order).limit(limit).all();
  const total = db.select({ n: count() }).from(gamesTable).where(where).get()?.n ?? 0;
  return { total_matches: total, returned: games.length, games };
}

export function aggregateGames(db: Db, input: AggregateGamesInput) {
  const where = buildWhere(input.filters);
  const fn = input.metric;
  const value =
    fn === "count"
      ? sql<number>`count(*)`
      : sql<number>`${sql.raw(fn)}(${gamesTable[input.field!]})`; // fn comes from a zod enum, never free text

  if (!input.group_by) {
    const row = db.select({ value }).from(gamesTable).where(where).get();
    return { metric: fn, field: input.field ?? null, value: round(row?.value ?? null) };
  }

  const groupColumn = gamesTable[input.group_by];
  const rows = db
    .select({ group: groupColumn, value })
    .from(gamesTable)
    .where(where)
    .groupBy(groupColumn)
    .orderBy(desc(value))
    .all();
  return {
    metric: fn,
    field: input.field ?? null,
    group_by: input.group_by,
    groups: rows.map((r) => ({ group: r.group, value: round(r.value) })),
  };
}

/** Resolves each title (exact match first, then substring) and returns the matched games side by side. */
export function compareGames(db: Db, input: CompareGamesInput) {
  const found: Game[] = [];
  const not_found: string[] = [];
  const ambiguous: { query: string; candidates: string[] }[] = [];

  for (const query of input.titles) {
    const exact = db.select().from(gamesTable).where(ciEquals(gamesTable.title, query)).all();
    const matches = exact.length ? exact : db.select().from(gamesTable).where(titleContains(query)).limit(6).all();
    if (matches.length === 1) found.push(matches[0]);
    else if (matches.length === 0) not_found.push(query);
    else ambiguous.push({ query, candidates: matches.map((g) => g.title) });
  }
  return { found, not_found, ambiguous };
}

function round(n: number | null) {
  return n === null ? null : Math.round(n * 100) / 100;
}
