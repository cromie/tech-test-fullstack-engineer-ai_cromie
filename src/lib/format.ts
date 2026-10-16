export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const int = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** Stat-tile values: 1,284 / 12.9K / $4.2M */
export const compact = (n: number, currency = false) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    ...(currency ? { style: "currency", currency: "USD" } : {}),
  }).format(n);
