import { HttpRequest } from "@azure/functions";
import { z, ZodSchema } from "zod";

/**
 * Parse dan validasi request body dengan Zod schema.
 * Throw ZodError jika tidak valid (ditangkap oleh errorHandler).
 */
export async function validateBody<T extends ZodSchema>(
  request: HttpRequest,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Parse dan validasi query parameters dengan Zod schema.
 * Mengambil semua keys dari schema dan extract dari request.query.
 * Throw ZodError jika tidak valid.
 */
export function validateQueryParams<T extends ZodSchema>(
  request: HttpRequest,
  schema: T
): z.infer<T> {
  // Extract semua query params ke plain object
  const params: Record<string, string | null> = {};
  for (const [key, value] of request.query.entries()) {
    params[key] = value;
  }
  return schema.parse(params);
}
