import type { ToolUIPart } from "ai";
import { usd } from "@/lib/format";
import type { GameTools } from "@/lib/ai/types";

type Part = ToolUIPart<GameTools>;

const LABELS: Record<Part["type"], string> = {
  "tool-query_games": "Query games",
  "tool-aggregate_games": "Aggregate games",
  "tool-compare_games": "Compare games",
};

function summarize(part: Part): string | null {
  if (part.state !== "output-available") return null;
  switch (part.type) {
    case "tool-query_games":
      return `${part.output.returned} of ${part.output.total_matches} matching games`;
    case "tool-aggregate_games": {
      const o = part.output;
      if ("groups" in o && o.groups) return `${o.groups.length} groups by ${o.group_by}`;
      const v = "value" in o ? o.value : null;
      return `${o.metric}${o.field ? `(${o.field})` : ""} = ${
        v === null ? "n/a" : o.field === "monthly_revenue_usd" && o.metric !== "count" ? usd(v) : v
      }`;
    }
    case "tool-compare_games": {
      const o = part.output;
      const extra = [
        o.not_found.length && `${o.not_found.length} not found`,
        o.ambiguous.length && `${o.ambiguous.length} ambiguous`,
      ].filter(Boolean);
      return [`${o.found.length} found`, ...extra].join(", ");
    }
  }
}

export function ToolCall({ part }: { part: Part }) {
  const running = part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";
  const summary = summarize(part);

  return (
    <details className="group mb-2 rounded border border-zinc-200 bg-zinc-50 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-zinc-600">
        <span aria-hidden className={running ? "animate-spin" : ""}>
          {running ? "◌" : failed ? "✗" : "✓"}
        </span>
        <span className="font-medium text-zinc-800">{LABELS[part.type]}</span>
        {summary && <span className="truncate text-zinc-500">· {summary}</span>}
        {failed && <span className="text-red-600">· failed</span>}
        <span className="ml-auto text-zinc-400 group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="space-y-2 border-t border-zinc-200 px-2 py-2">
        {part.input !== undefined && <JsonBlock label="Input" value={part.input} />}
        {part.state === "output-available" && <JsonBlock label="Output" value={part.output} />}
        {failed && <p className="text-red-600">{part.errorText}</p>}
      </div>
    </details>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 font-medium text-zinc-500">{label}</p>
      <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-[11px] leading-snug">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
