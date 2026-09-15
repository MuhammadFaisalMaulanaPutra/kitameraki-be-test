export type TaskFieldType =
    | "text"
    | "date"
    | "datetime"
    | "email";

export type TaskFieldColumn = 1 | 2;

export interface TaskField {
    id: string;
    name: string;
    label: string;
    type: TaskFieldType;
    required?: boolean;
    column?: TaskFieldColumn;
}