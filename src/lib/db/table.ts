import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gamesTable = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  developer: text("developer").notNull(),
  genre: text("genre").notNull(),
  monthly_revenue_usd: real("monthly_revenue_usd").notNull(),
  monthly_downloads: integer("monthly_downloads").notNull(),
  average_rating: real("average_rating").notNull(),
});
