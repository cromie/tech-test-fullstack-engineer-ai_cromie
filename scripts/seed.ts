import { createDb, dbPath, seed } from "../src/lib/db";

const file = dbPath();
seed(createDb(file));
console.log(`Seeded ${file}`);
