import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { createGame, listGames } from "@/lib/games";
import { parseBody } from "@/lib/http";
import { gameInputSchema } from "@/lib/schema";

export async function GET() {
  await connection(); // sync SQLite reads would otherwise be prerendered at build time
  return Response.json(listGames(getDb()));
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, gameInputSchema);
  if ("response" in parsed) return parsed.response;
  return Response.json(createGame(getDb(), parsed.data), { status: 201 });
}
