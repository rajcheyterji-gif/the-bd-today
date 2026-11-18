// Zod validation helpers for Hono handlers. Invalid input throws an
// HTTPException(400) whose message lists the failing fields; the app error
// handler in src/server/index.ts turns it into the error envelope.
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { z } from "zod";

/** Parse + validate a JSON request body against a Zod schema. */
export async function validateBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  const json: unknown = await c.req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new HTTPException(400, { message: validationMessage(result.error) });
  }
  return result.data;
}

/** Parse + validate the query string against a Zod schema. */
export function validateQuery<T extends z.ZodTypeAny>(c: Context, schema: T): z.infer<T> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new HTTPException(400, { message: validationMessage(result.error) });
  }
  return result.data;
}

function validationMessage(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
  return `Validation failed: ${details}`;
}
