import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { gamesTable } from "./table";
import { SEED_GAMES } from "./seed-data";

export type Db = BetterSQLite3Database;

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  developer TEXT NOT NULL,
  genre TEXT NOT NULL,
  monthly_revenue_usd REAL NOT NULL,
  monthly_downloads INTEGER NOT NULL,
  average_rating REAL NOT NULL
)`;

export function seed(db: Db) {
  db.delete(gamesTable).run();
  db.run(sql`DELETE FROM sqlite_sequence WHERE name = 'games'`); // restart ids at 1
  db.insert(gamesTable).values(SEED_GAMES).run();
}

/** Opens a database, creating the table. Seeds when the database is brand new. */
export function createDb(file: string): Db {
  const isNew = file === ":memory:" || !fs.existsSync(file);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_TABLE);
  const db = drizzle({ client: sqlite });
  if (isNew) seed(db);
  return db;
}

export function dbPath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "games.db");
}

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { gamesDb?: Db };

export function getDb(): Db {
  globalForDb.gamesDb ??= createDb(dbPath());
  return globalForDb.gamesDb;
}
