import { z } from "zod";

export const TaskSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Judul tugas minimal harus 3 karakter!"),
    description: z.string().optional(),
    status: z.enum(['Todo', 'In Progress', 'Done']).default('Todo'),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
}).passthrough();

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'date' | 'date-time' | 'email';
    required: boolean;
    isDefault?: boolean;
}

export interface FormConfig {
    id: string; 
    type: string; 
    columns: number; 
    fields: FormField[];
}

export type Task = z.infer<typeof TaskSchema>;
    