# Full Stack Engineer (AI) — Technical Assessment

**Time limit:** 2–3 hours max.

---

## Challenge

Build a small **internal dashboard** to manage a catalog of indie games, plus an **AI chat** that answers natural-language questions about that catalog.

### Requirements

1. **Games CRUD**
   Fields: `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`.
   Persist locally (SQLite, JSON, or in-memory).

2. **REST API**
   Expose the catalog via API routes.

3. **AI Chat**
   Chat UI that answers questions like:
   - *"Which game made the most revenue last month?"*
   - *"How many games are rated above 4?"*
   - *"Compare revenue of Game A vs Game B."*

   - Must use **tool calling / function calling** to query the data. Do **not** dump the full DB into the prompt.
   - Responses must **stream**.

4. **UI**
   Dashboard view (table or cards) + chat view. Tailwind is fine.

### Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- **LLM layer:** your choice — Anthropic SDK, OpenAI SDK, Vercel AI SDK, OpenRouter, LangChain / LangGraph, etc. Any model/provider is fine as long as tool calling + streaming work.
- Storage: your choice (SQLite, JSON, in-memory)

### Out of scope

Auth, deployment, production error handling, full test coverage.

---

## Mandatory: `AI_WORKFLOW.md`

Include a file documenting how you used AI coding tools (Claude Code, Cursor, etc.) during this assessment:

1. Which tool(s) and why.
2. 3–5 concrete prompts you used and their outcome.
3. One moment where the AI got it wrong and how you fixed it.
4. If you used parallel agents / subagents / worktrees, describe how.

---

## Evaluation

| Area | Weight |
|---|---|
| Use of AI coding tools (`AI_WORKFLOW.md`) | 30% |
| Full-stack implementation (CRUD + API + chat + tool use) | 30% |
| Code quality | 20% |
| UX | 10% |
| README clarity | 10% |

---

## How to submit

1. **Fork** this repo.
2. Create branch `submission/<your-name>`.
3. Implement.
4. Open a **Pull Request** to `main` of this repo.
5. In the PR include: time spent, how to run locally, trade-offs made.
