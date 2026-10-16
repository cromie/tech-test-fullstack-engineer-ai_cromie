# AI Workflow

> Draft built from [`docs/ai-log.md`](docs/ai-log.md), the raw per-milestone log written during the work. Every example here actually happened.

## 1. Tools and why

- **Claude Code (Opus 5.5) in the terminal** for planning, implementation, verification and commits. It can run the type checker, tests, the dev server and curl itself, so every milestone ended with real verification output instead of "looks right".
- **Plan mode first, gated execution.** I asked for a 1-page plan with an MVP phase and a separate extras phase that only starts after I review the MVP. Each milestone had a verify command, a small commit and a log entry.
- **`CLAUDE.md` as the contract.** It holds the stack, commands, conventions, security rules and definition of done. Version-specific findings (AI SDK v7 renames, the Next 16 caching gotcha) were added there as soon as they were found, so later steps used them.
- **Model in the app:** Claude Sonnet 5.5 via the Vercel AI SDK. It is reliable at multi-step tool calling and fast at streaming.

## 2. Prompts and outcomes

1. **Planning prompt** (plan mode): "MVP first, extras behind a gate; security guardrails non-negotiable; ask at most 3 questions, only ones that change the plan; list top 3 places AI will go wrong." *Outcome:* three focused questions ("last month" semantics, model, scope) and a plan with time-boxed milestones. One of its predicted failure points (AI SDK API drift) turned out to be real.
2. **"If unsure about a current API, check the installed version's docs, not memory."** *Outcome:* the agent read `node_modules/ai/docs` and `node_modules/next/dist/docs` before writing code. It found v7 renames and that Next 16 `cacheComponents` would prerender synchronous SQLite reads at build time, which would have frozen the dashboard.
3. **"approve phase 1"** with the milestone loop (implement, verify, commit, log). *Outcome:* M0–M5 each landed as a separate commit with test, curl or typecheck evidence.
4. *(to add: Phase 2 prompts)*

## 3. When the AI got it wrong

- **Wrong test expectation (M1).** The agent wrote a group-by test claiming the top-grossing developer was Anvilheart ($132,200). The test failed. The query was right: Gridline Studio = $72,900 + $64,100 = $137,000. Fix: corrected the expectation, not the code. Takeaway: don't trust AI arithmetic over fixtures; let the runner check it.
- **Planned APIs from memory (M0).** The plan named `toUIMessageStreamResponse`, `stepCountIs` and `system`. AI SDK v7 uses `createUIMessageStreamResponse` + `toUIMessageStream`, `isStepCount` and `instructions`. This was caught by reading the installed docs before coding.
- **Smaller ones:** exported constants from a route file (Next rejects that); asked the model for markdown tables without adding `remark-gfm`; reseeding without resetting the AUTOINCREMENT counter (the smoke test created id 31).

## 4. Parallel agents / subagents / worktrees

*(to fill in: none used in Phase 1, which ran as a single agent. A fresh-context reviewer subagent is on the Phase 2 menu.)*
