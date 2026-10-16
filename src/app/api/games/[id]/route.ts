import { connection, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { deleteGame, getGame, updateGame } from "@/lib/games";
import { jsonError, parseBody } from "@/lib/http";
import { gameIdSchema, gameUpdateSchema } from "@/lib/schema";

type Ctx = RouteContext<"/api/games/[id]">;

async function parseId(ctx: Ctx) {
  const result = gameIdSchema.safeParse((await ctx.params).id);
  return result.success ? result.data : null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  await connection();
  const id = await parseId(ctx);
  if (id === null) return jsonError(400, "Invalid id");
  const game = getGame(getDb(), id);
  return game ? Response.json(game) : jsonError(404, "Game not found");
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = await parseId(ctx);
  if (id === null) return jsonError(400, "Invalid id");
  const parsed = await parseBody(req, gameUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const game = updateGame(getDb(), id, parsed.data);
  return game ? Response.json(game) : jsonError(404, "Game not found");
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const id = await parseId(ctx);
  if (id === null) return jsonError(400, "Invalid id");
  return deleteGame(getDb(), id) ? new Response(null, { status: 204 }) : jsonError(404, "Game not found");
}
