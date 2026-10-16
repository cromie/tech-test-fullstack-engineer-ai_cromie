# AI log

Raw working log, appended per milestone. Source for AI_WORKFLOW.md. Real events only.

## Planning (Claude Code, Opus 5.5, plan mode)
- **Prompt:** structured plan-mode prompt: MVP first with a gate before extras, security guardrails, ≤3 clarifying questions, CLAUDE.md draft, list of likely AI failure points.
- **Outcome:** asked 3 questions ("last month" interpretation, model, scope). I picked: snapshot (monthly_revenue_usd = last month), Sonnet 5.5, scope as written. Got a 1-page plan with 6 milestones.
- **Changed:** nothing; approved phase 1 as is.

## M0 — scaffold
- **Prompt:** "approve phase 1".
- **Outcome:** `create-next-app@16.4.2` (latest; README says 14+). Repo already had README/.gitignore, so the agent scaffolded in a scratch dir and rsynced it in, keeping the original README/.gitignore.
- **Hiccup:** `vitest@5` peer-requires `@types/node >=22`; the scaffold pins `^20` → ERESOLVE. Fixed by bumping `@types/node` to `^24` (no `--force`).
- **AI near-miss:** the plan named AI SDK APIs from memory (`toUIMessageStreamResponse`, `stepCountIs`, `system`). Reading `node_modules/ai/docs` showed v7 renamed them (`createUIMessageStreamResponse`+`toUIMessageStream`, `isStepCount`, `instructions`). Also found Next 16 `cacheComponents` treats sync I/O (better-sqlite3) as prerenderable → dashboard would be frozen at build. Both recorded in CLAUDE.md.
- **Noted, not fixed:** `npm audit` reports 5 high in the `eslint-config-next` → fast-glob → micromatch chain (dev-only). Did not `audit fix --force`.

## M1 — schema, DB, query functions
- **Outcome:** one zod schema file with whitelisted enums for filter/sort/group columns; Drizzle + better-sqlite3; DB auto-creates and seeds on first open; `queryGames`/`aggregateGames`/`compareGames` take `db` as a param so tests use `:memory:`. 12 Vitest tests.
- **Design choice:** seed has two games at exactly 4.0, so a test can tell "above 4" (`gt` → 9) apart from `gte` (11).
- **AI mistake:** the agent hand-wrote an expected value in the group-by test as "Anvilheart 132,200 is the top developer". The test failed, and the code was right: Gridline Studio = 72,900 + 64,100 = 137,000. Fixed the expectation, not the code. Lesson: AI mental arithmetic over fixtures isn't reliable; let the test runner check it.
- **Verify:** `npm test` 12/12, typecheck + lint clean.

## M2 — REST API
- **Outcome:** `/api/games` (GET, POST) and `/api/games/[id]` (GET, PATCH, DELETE), typed with Next 16's `RouteContext<'/api/games/[id]'>` (found in installed docs). Shared `parseBody` helper returns zod `flattenError` details on 400. GETs call `connection()` so they aren't prerendered.
- **Verify:** `scripts/smoke-api.sh` against dev: 200 list, 201 create, 200 get/patch, 400 bad payload / bad JSON / bad id, 204 delete, 404 after delete.
- **Bug caught by the smoke run:** the created game got id 31. `db:seed` deleted rows but AUTOINCREMENT kept counting. Now reset `sqlite_sequence` on reseed (ids are 1–15 again).

## M3 — dashboard
- **Outcome:** server page reads the DB in a `<Suspense>` + `connection()` boundary and hands the rows to a client `GamesManager` (table + create/edit/delete). The form validates with the same `gameInputSchema` as the API and shows per-field errors; API errors show in an alert box. Includes an empty state.
- **Verify:** typecheck + lint clean; SSR HTML for `/` contains the seeded rows. CRUD behaviour is covered by the M2 smoke script; the in-browser click-through is still for me to do by hand.

## M4 — streaming chat + tools
- **Outcome:** `/api/chat` uses v7 `streamText` with `instructions`, 3 read-only tools whose `inputSchema` is the shared zod schema, `isStepCount(5)` and `maxOutputTokens: 1024`, streamed via `createUIMessageStreamResponse(toUIMessageStream(...))`, and an `onError` that masks errors. Requests go through `safeValidateUIMessages` and are rejected for system role, >30 messages or >2000 chars. `/chat` uses `useChat` and renders markdown with react-markdown (no raw HTML).
- **AI mistakes caught before running:** (1) exported `MAX_*` constants from a route file, which Next rejects as invalid route exports; made them module-private. (2) the instructions ask for markdown tables, but react-markdown needs `remark-gfm` for tables; added it (checked maintainers on npm first).
- **Changed:** moved the API-key check after input validation so the guards can be tested without a key.
- **Verify (no key yet):** curl shows 400 for bad JSON, 2001-char message, injected system message and 31 messages; a valid request reaches the key check (500 "not configured"). Live answers to the 3 README questions are pending an API key.

## M5 — docs + full verification
- **Outcome:** README rewritten for the submission (run steps, API table, tools table, trade-offs, security notes); the original challenge moved to `docs/CHALLENGE.md`; `AI_WORKFLOW.md` drafted from this log.
- **Bug found only by `next build`:** prerendering `/chat` failed with `blocking-prerender-random-client` because `useChat` generates random ids during render. Typecheck, lint and dev mode all passed. Fixed with a `<Suspense>` boundary (Next's suggested fix). Takeaway: run a production build at every milestone, not only at the end.
- **Verify:** typecheck ✓, lint ✓, 12/12 tests ✓, `next build` ✓ (`/` partial prerender, API routes dynamic).
