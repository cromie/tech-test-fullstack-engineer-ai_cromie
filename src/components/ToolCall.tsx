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
      if ("groups" in o && o.groups) return `${o.total_groups} groups by ${o.group_by}`;
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
        o.duplicates.length && `${o.duplicates.length} duplicate`,
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
    <details className="group mb-3 rounded-lg border border-line bg-canvas/60 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-ink-2">
        <span aria-hidden className={running ? "animate-spin text-accent" : failed ? "text-danger" : "text-emerald-400"}>
          {running ? "◌" : failed ? "✗" : "✓"}
        </span>
        <span className="font-medium text-ink">{LABELS[part.type]}</span>
        {summary && <span className="truncate text-ink-3">· {summary}</span>}
        {failed && <span className="text-danger">· failed</span>}
        <span className="ml-auto text-ink-3 transition-transform group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-2.5">
        {part.input !== undefined && <JsonBlock label="Input" value={part.input} />}
        {part.state === "output-available" && <JsonBlock label="Output" value={part.output} />}
        {failed && <p className="text-danger">{part.errorText}</p>}
      </div>
    </details>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 font-medium text-ink-3">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md border border-line bg-surface p-2 text-[11px] leading-snug text-ink-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
