import type { TaskField } from "./TaskField";

export interface FormSettings {
    id: string;
    organizationId: string;
    fields: TaskField[];
}