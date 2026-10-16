import { z } from "zod";

/** Shared validation for the games catalog: used by the API, the form and the AI tools. */
export const gameInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  developer: z.string().trim().min(1, "Developer is required").max(100),
  genre: z.string().trim().min(1, "Genre is required").max(50),
  monthly_revenue_usd: z.number().nonnegative().max(1_000_000_000),
  monthly_downloads: z.number().int().nonnegative().max(1_000_000_000),
  average_rating: z.number().min(0).max(5),
});

export const gameUpdateSchema = gameInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const gameIdSchema = z.coerce.number().int().positive();

export type GameInput = z.infer<typeof gameInputSchema>;
export type GameUpdate = z.infer<typeof gameUpdateSchema>;
export type Game = GameInput & { id: number };

/** Whitelists: the only columns the AI tools may filter, sort or group by. */
export const NUMERIC_FIELDS = ["monthly_revenue_usd", "monthly_downloads", "average_rating"] as const;
export const TEXT_FIELDS = ["title", "developer", "genre"] as const;
export const GROUP_FIELDS = ["genre", "developer"] as const;

export const numericFieldSchema = z.enum(NUMERIC_FIELDS);
export const sortFieldSchema = z.enum([...NUMERIC_FIELDS, ...TEXT_FIELDS]);
export const groupFieldSchema = z.enum(GROUP_FIELDS);

export const MAX_RESULTS = 50;

const numericConditionSchema = z.object({
  field: numericFieldSchema,
  op: z.enum(["gt", "gte", "lt", "lte", "eq"]).describe("gt means strictly greater than"),
  value: z.number(),
});

export const filtersSchema = z.object({
  genre: z.string().max(50).optional().describe("Exact genre, case-insensitive"),
  developer: z.string().max(100).optional().describe("Exact developer, case-insensitive"),
  title_contains: z.string().max(100).optional().describe("Substring of the title, case-insensitive"),
  numeric: z.array(numericConditionSchema).max(6).optional(),
});

export const queryGamesSchema = z.object({
  filters: filtersSchema.optional(),
  sort_by: sortFieldSchema.optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional().describe(`Default 10, max ${MAX_RESULTS}`),
});

export const aggregateGamesSchema = z
  .object({
    metric: z.enum(["count", "sum", "avg", "min", "max"]),
    field: numericFieldSchema.optional().describe("Required unless metric is count"),
    group_by: groupFieldSchema.optional(),
    filters: filtersSchema.optional(),
  })
  .refine((v) => v.metric === "count" || v.field, { message: "field is required for this metric", path: ["field"] });

export const compareGamesSchema = z.object({
  titles: z.array(z.string().trim().min(1).max(100)).min(2).max(5),
});

export type Filters = z.infer<typeof filtersSchema>;
export type QueryGamesInput = z.infer<typeof queryGamesSchema>;
export type AggregateGamesInput = z.infer<typeof aggregateGamesSchema>;
export type CompareGamesInput = z.infer<typeof compareGamesSchema>;
