import { compact } from "@/lib/format";
import type { Game } from "@/lib/schema";
import { Cover } from "./GameVisuals";

export function StatTiles({ games }: { games: Game[] }) {
  const revenue = games.reduce((n, g) => n + g.monthly_revenue_usd, 0);
  const downloads = games.reduce((n, g) => n + g.monthly_downloads, 0);
  const avgRating = games.length ? games.reduce((n, g) => n + g.average_rating, 0) / games.length : null;
  const top = games.reduce<Game | null>((best, g) => (!best || g.monthly_revenue_usd > best.monthly_revenue_usd ? g : best), null);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Monthly revenue" value={compact(revenue, true)} hint={`across ${games.length} games`} />
      <Tile label="Monthly downloads" value={compact(downloads)} hint="all titles" />
      <Tile label="Average rating" value={avgRating === null ? "–" : avgRating.toFixed(2)} hint="out of 5" />
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs text-ink-3">Top earner</p>
        {top ? (
          <div className="mt-2 flex items-center gap-3">
            <Cover title={top.title} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{top.title}</p>
              <p className="text-xs text-ink-2">{compact(top.monthly_revenue_usd, true)} / mo</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-ink-3">–</p>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-ink-3">{hint}</p>
    </div>
  );
}
