import { z } from 'zod';
import { AppError } from '../libs/response';

const PROTECTED_FIELDS = new Set(['id', 'organizationId', 'isDeleted', 'createdAt']);

const StatusSchema = z.number().int().min(0).max(3);

const TaskBodySchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  description: z.string().max(2000).optional(),
  status: StatusSchema.optional(),
}).passthrough();

const UpdateBodySchema = z.record(z.string(), z.unknown());

function parseZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const msg = issue?.message ?? 'Validation error';
    throw new AppError(msg, 400);
  }
  return result.data;
}

export function parseOrganizationId(value: string | null): number {
  const n = parseInt(value ?? '', 10);
  if (isNaN(n) || n <= 0) throw new AppError('organizationId is required and must be a positive integer', 400);
  return n;
}

export function parseTaskId(value: string | null): string {
  if (!value?.trim()) throw new AppError('id is required', 400);
  return value.trim();
}

export function parsePagination(pageNumber?: string | null, pageSize?: string | null) {
  const page = Math.max(1, parseInt(pageNumber ?? '1', 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize ?? '10', 10) || 10));
  return { pageNumber: page, pageSize: size };
}

export function parseStatus(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const n = parseInt(value, 10);
  return parseZod(StatusSchema, n);
}

export function validateTaskBody(body: unknown) {
  return parseZod(TaskBodySchema, body);
}

export function validateUpdateBody(body: unknown): Record<string, unknown> {
  const parsed = parseZod(UpdateBodySchema, body);
  if (Object.keys(parsed).length === 0) throw new AppError('Request body must contain at least one field', 400);
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(parsed)) {
    if (!PROTECTED_FIELDS.has(key)) safe[key] = parsed[key];
  }
  return safe;
}

export function validateStatusBody(body: unknown): number {
  return parseZod(z.object({ status: StatusSchema }), body).status;
}

export function validateTaskIds(body: unknown): string[] {
  const schema = z.array(z.union([z.string(), z.number()]).transform(String));
  const parsed = parseZod(schema, body);
  if (parsed.length === 0) throw new AppError('Body must be a non-empty array of task IDs', 400);
  return parsed;
}
