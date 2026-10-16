import { usd } from "@/lib/format";

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Decorative "cover art": a two-tone gradient seeded by the title, with initials so identity never relies on color. */
export function Cover({ title, size = "md" }: { title: string; size?: "md" | "lg" }) {
  const hue = hash(title) % 360;
  const initials = title
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg font-semibold text-white/90 ring-1 ring-white/10 ${
        size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs"
      }`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${(hue + 50) % 360} 55% 18%))` }}
    >
      {initials}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  const pct = (rating / 5) * 100;
  return (
    <span className="inline-flex items-center gap-2" title={`${rating.toFixed(1)} out of 5`}>
      <span className="relative inline-block text-sm leading-none tracking-[0.15em]" aria-hidden>
        <span className="text-line">★★★★★</span>
        <span className="absolute inset-0 overflow-hidden text-star" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="tabular-nums text-ink">{rating.toFixed(1)}</span>
    </span>
  );
}

/** Revenue with a thin bar relative to the top earner (single sequential hue; the number is in ink, not bar color). */
export function RevenueBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="tabular-nums text-ink">{usd(value)}</span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-accent-soft/30 xl:block" aria-hidden>
        <span className="block h-full rounded-r-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

export function GenrePill({ genre }: { genre: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">
      {genre}
    </span>
  );
}
