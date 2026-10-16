import { createAnthropic } from "@ai-sdk/anthropic";

// User-level (non-workspace-scoped) keys must name a workspace on every request.
const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

const anthropic = createAnthropic({
  headers: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
});

export const chatModel = () => anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");
