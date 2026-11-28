import { HttpError, isUuid } from "./http";
import { BUILT_IN_FIELDS, BUILT_IN_IDS } from "./defaults";
import {
  CUSTOM_FIELD_TYPES, TASK_PRIORITIES, TASK_STATUSES,
  type FormField, type FormRow, type TaskInput, type TaskListQuery, type TaskPriority, type TaskStatus,
} from "./types";

export const MAX_COLUMNS = 2;
const bad = (message: string): never => {throw new HttpError(400, message);};

function onlyKeys(obj: Record<string, unknown>, allowed: string[], what: string) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) bad(`${what}: unknown or forbidden property "${key}"`);
  }
}

function str(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== "string") return bad(`${name} must be a string`);
  const v = value.trim();
  if (v.length < min || v.length > max) bad(`${name} must be ${min === 0 ? "at most" : `${min}-`}${max} characters`);
  return v;
}

// ---------- task input -----------
const TASK_KEYS = ["title", "description", "dueDate", "priority", "status", "tags", "customFields"];

export function validateTaskInput(body: Record<string, unknown>, partial: boolean): Partial<TaskInput> {

  onlyKeys(body, TASK_KEYS, "Task");
  const out: Record<string, unknown> = {};

  if ("title" in body) out.title = str(body.title, "title", 1, 100);
  else if (!partial) bad("title is required");

  if ("description" in body) out.description = body.description === null ? null : str(body.description, "description", 0, 1000);

  if ("dueDate" in body) {
    if (body.dueDate === null) out.dueDate = null;
    else if (typeof body.dueDate === "string" && !Number.isNaN(Date.parse(body.dueDate))) out.dueDate = new Date(body.dueDate).toISOString();
    else bad("dueDate must be date-time or null");
  }

  if ("priority" in body) {
    if (body.priority !== null && !TASK_PRIORITIES.includes(body.priority as TaskPriority)) bad(`priority must be one of: ${TASK_PRIORITIES.join(", ")}`);
    out.priority = body.priority;
  }

  if ("status" in body) {
    if (!TASK_STATUSES.includes(body.status as TaskStatus)) bad(`status must be one of: ${TASK_STATUSES.join(", ")}`);
    out.status = body.status;
  }

  if ("tags" in body) {
    if (!Array.isArray(body.tags) || body.tags.length > 20) bad("tags must be an array of at most 20 strings");
    // trim, drop duplicates, keep order.
    out.tags = [...new Set((body.tags as unknown[]).map((t) => str(t, "tag", 1, 50)))];
  }

  if ("customFields" in body) {
    const cf = body.customFields;
    if (typeof cf !== "object" || cf === null || Array.isArray(cf)) bad("customFields must be an object");
    const entries = Object.entries(cf as Record<string, unknown>);
    if (entries.length > 50) bad("customFields allows at most 50 keys");
    const clean: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(key)) bad(`customFields key "${key}" is invalid`);
      clean[key] = str(value, `customFields.${key}`, 0, 1000);
    }
    out.customFields = clean;
  }

  if (partial && Object.keys(out).length === 0) bad("Provide at least one property to update");
  return out as Partial<TaskInput>;
}

// list query
export function validateListQuery(q: URLSearchParams): TaskListQuery {
  const int = (name: string, def: number, min: number, max: number) => {
    const raw = q.get(name);
    if (raw === null || raw === "") return def;

    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) bad(`${name} must be an integer between ${min} and ${max}`);

    return n;
  };

  const query: TaskListQuery = { page: int("page", 1, 1, 100000), pageSize: int("pageSize", 10, 1, 100) };

  const search = q.get("search")?.trim();
  if (search) query.search = str(search, "search", 1, 100);

  const status = q.get("status");
  if (status) {
    if (!TASK_STATUSES.includes(status as TaskStatus)) bad(`status must be one of: ${TASK_STATUSES.join(", ")}`);
    query.status = status as TaskStatus;
  }

  const priority = q.get("priority");
  if (priority) {
    if (!TASK_PRIORITIES.includes(priority as TaskPriority)) bad(`priority must be one of: ${TASK_PRIORITIES.join(", ")}`);
    query.priority = priority as TaskPriority;
  }

  return query;
}

// bulk delete
export function validateBulkIds(body: Record<string, unknown>): string[] {
  
  onlyKeys(body, ["ids"], "Body");

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100) bad("ids must be an array of 1-100 UUIDs");

  const list = ids as unknown[];
  if (!list.every(isUuid)) bad("every id must be UUID");

  return [...new Set(list as string[])];
}

// form settings
export function validateFormRows(body: Record<string, unknown>): FormRow[] {

  onlyKeys(body, ["rows"], "Body");
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 200) bad("rows must be an array of 1-200 rows");

  const seen = new Set<string>();
  const seenRows = new Set<string>();
  const clean: FormRow[] = [];

  for (const raw of rows as unknown[]) {
    if (typeof raw !== "object" || raw === null) return bad("each row must be an object");

    const r = raw as Record<string, unknown>;
    onlyKeys(r, ["id", "fields"], "Row");
    const rowId = str(r.id, "row.id", 1, 64);

    if (seenRows.has(rowId)) bad(`duplicate row id "${rowId}"`);
    seenRows.add(rowId);
    if (!Array.isArray(r.fields) || r.fields.length < 1 || r.fields.length > MAX_COLUMNS) bad(`a row must have 1-${MAX_COLUMNS} fields`);

    const fields: FormField[] = [];
    for (const rawField of r.fields as unknown[]) {

      if (typeof rawField !== "object" || rawField === null) return bad("each field must be an object");

      const f = rawField as Record<string, unknown>;
      onlyKeys(f, ["id", "label", "type"], "Field");
      const id = str(f.id, "field.id", 1, 64);
      
      if (!/^[A-Za-z0-9_-]+$/.test(id)) bad(`field id "${id}" may only contain letters, digits, _ and -`);
      if (seen.has(id)) bad(`duplicate field id "${id}"`);
      seen.add(id);
      const label = str(f.label, "field.label", 1, 50);

      const builtIn = BUILT_IN_FIELDS[id];
      if (builtIn) {
        if (f.type !== builtIn.type) bad(`built-in field "${id}" must have type "${builtIn.type}"`);
        fields.push({ id, label, type: builtIn.type });
      } else {
        if (!CUSTOM_FIELD_TYPES.includes(f.type as never)) bad(`custom field type must be one of: ${CUSTOM_FIELD_TYPES.join(", ")}`);
        fields.push({ id, label, type: f.type as FormField["type"] });
      }
    }
    clean.push({ id: rowId, fields });
  }

  for (const id of BUILT_IN_IDS) if (!seen.has(id)) bad(`built-in field "${id}" cannot be removed`);
  return clean;
}

