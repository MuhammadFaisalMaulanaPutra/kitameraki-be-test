import type { FormField, FormRow, FormSettings } from "./types";

export const BUILT_IN_FIELDS: Record<string, FormField> = {
  title: { id: "title", label: "Title", type: "text" },
  description: { id: "description", label: "Description", type: "textarea" },
  status: { id: "status", label: "Status", type: "status" },
  priority: { id: "priority", label: "Priority", type: "priority" },
  dueDate: { id: "dueDate", label: "Due date", type: "datetime" },
  tags: { id: "tags", label: "Tags", type: "tags" },
};

export const BUILT_IN_IDS = Object.keys(BUILT_IN_FIELDS);

// default layoutr
export function defaultRows(): FormRow[] {
  const b = BUILT_IN_FIELDS;
  return [
    { id: "row-title", fields: [{ ...b.title }] },
    { id: "row-description", fields: [{ ...b.description }] },
    { id: "row-status-priority", fields: [{ ...b.status }, { ...b.priority }] },
    { id: "row-due-tags", fields: [{ ...b.dueDate }, { ...b.tags }] },
  ];
}

// default return when GET /form-settings hit but organization never saved a setting
export function defaultFormSettings(organizationId: string) :
FormSettings {
  return { id: organizationId, organizationId, rows: defaultRows(), updatedAt: new Date(0).toISOString() };
}