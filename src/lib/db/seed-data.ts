import type { GameInput } from "../schema";

// Fictional titles and studios. Two games sit at exactly 4.0 so "above 4" (9) differs from ">= 4" (11).
export const SEED_GAMES: GameInput[] = [
  { title: "Lantern Drift", developer: "Moth & Ember", genre: "Adventure", monthly_revenue_usd: 48200, monthly_downloads: 12400, average_rating: 4.6 },
  { title: "Pixel Orchard", developer: "Sprout Games", genre: "Simulation", monthly_revenue_usd: 31500, monthly_downloads: 22100, average_rating: 4.3 },
  { title: "Neon Courier", developer: "Gridline Studio", genre: "Action", monthly_revenue_usd: 72900, monthly_downloads: 18300, average_rating: 4.1 },
  { title: "Hollow Tides", developer: "Brackwater", genre: "Metroidvania", monthly_revenue_usd: 55400, monthly_downloads: 9800, average_rating: 4.8 },
  { title: "Tiny Parliament", developer: "Quorum Labs", genre: "Strategy", monthly_revenue_usd: 12800, monthly_downloads: 4300, average_rating: 3.9 },
  { title: "Starlit Kitchen", developer: "Sprout Games", genre: "Simulation", monthly_revenue_usd: 26700, monthly_downloads: 15600, average_rating: 4.0 },
  { title: "Rust & Rune", developer: "Anvilheart", genre: "RPG", monthly_revenue_usd: 88300, monthly_downloads: 14200, average_rating: 4.4 },
  { title: "Echo Garden", developer: "Moth & Ember", genre: "Puzzle", monthly_revenue_usd: 9400, monthly_downloads: 7600, average_rating: 4.7 },
  { title: "Dungeon Delivery Co.", developer: "Gridline Studio", genre: "Roguelike", monthly_revenue_usd: 64100, monthly_downloads: 20500, average_rating: 4.2 },
  { title: "Paper Kites", developer: "Foldwing", genre: "Puzzle", monthly_revenue_usd: 5200, monthly_downloads: 3900, average_rating: 3.6 },
  { title: "Frostbyte Racers", developer: "Coldstart", genre: "Racing", monthly_revenue_usd: 38800, monthly_downloads: 16700, average_rating: 3.8 },
  { title: "Mire Keeper", developer: "Brackwater", genre: "Horror", monthly_revenue_usd: 21300, monthly_downloads: 6100, average_rating: 4.0 },
  { title: "Cosmic Crumbs", developer: "Sprout Games", genre: "Platformer", monthly_revenue_usd: 17600, monthly_downloads: 11200, average_rating: 3.5 },
  { title: "Ledger of Ash", developer: "Anvilheart", genre: "Strategy", monthly_revenue_usd: 43900, monthly_downloads: 5400, average_rating: 4.5 },
  { title: "Moonwell Farm", developer: "Foldwing", genre: "Simulation", monthly_revenue_usd: 29900, monthly_downloads: 19800, average_rating: 4.1 },
];
