export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const int = (n: number) => new Intl.NumberFormat("en-US").format(n);
