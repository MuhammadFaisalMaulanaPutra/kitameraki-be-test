import type { FormSettings, Task } from "./types";

export function toTask(doc: Record<string, unknown>): Task {
  const { _rid, _self, _etag, _attachments, _ts, ...task } = doc;
  return task as unknown as Task;
}

export function toFormSettings(doc: Record<string, unknown>): FormSettings {
  const {_rid, _self, _etag, _attachments, _ts, ...settings} = doc;
  return settings as unknown as FormSettings;
}