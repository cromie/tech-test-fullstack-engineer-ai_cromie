import { tool } from "ai";
import { getDb } from "@/lib/db";
import { aggregateGames, compareGames, queryGames } from "@/lib/games";
import { aggregateGamesSchema, compareGamesSchema, MAX_RESULTS, queryGamesSchema } from "@/lib/schema";

// All tools are read-only and take whitelisted, zod-validated arguments. No raw SQL reaches the model.
export const gameTools = {
  query_games: tool({
    description:
      `List games matching optional filters, sorted by a column. Use for "which game has the most/least X", top-N lists and lookups. ` +
      `Returns at most ${MAX_RESULTS} rows plus total_matches.`,
    inputSchema: queryGamesSchema,
    execute: async (input) => queryGames(getDb(), input),
  }),
  aggregate_games: tool({
    description:
      "Compute count/sum/avg/min/max over games matching optional filters, optionally grouped by genre or developer. " +
      'Use for "how many", totals and averages.',
    inputSchema: aggregateGamesSchema,
    execute: async (input) => aggregateGames(getDb(), input),
  }),
  compare_games: tool({
    description:
      "Fetch 2–5 games by title (exact match first, then partial) to compare them side by side. " +
      "Reports titles that were not found or matched more than one game.",
    inputSchema: compareGamesSchema,
    execute: async (input) => compareGames(getDb(), input),
  }),
};
