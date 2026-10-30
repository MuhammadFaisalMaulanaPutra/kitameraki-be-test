import type { UpdateTask } from "./taskSchema";

export type TaskPatchOperation =
    { op: "set"; path: string; value: unknown } | { op: "remove"; path: string };

export function buildTaskPatchOperations(changes: UpdateTask): TaskPatchOperation[] {
    return Object.entries(changes).map(([key, value]) =>
        value === null
            ? { op: "remove" as const, path: `/${key}` }
            : { op: "set" as const, path: `/${key}`, value }
    );
}
