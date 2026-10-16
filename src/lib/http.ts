import { z } from "zod";

export function jsonError(status: number, error: string, details?: unknown) {
  return Response.json({ error, ...(details ? { details } : {}) }, { status });
}

/** Parses a JSON body against a schema; returns either data or a ready 400 response. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: jsonError(400, "Invalid JSON body") } as const;
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { response: jsonError(400, "Validation failed", z.flattenError(result.error)) } as const;
  }
  return { data: result.data as z.infer<T> } as const;
}
