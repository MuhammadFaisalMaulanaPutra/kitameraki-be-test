import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_FILE = 'db.json';

// ============== TYPES ==============

export type FieldType = 'text' | 'date' | 'datetime' | 'email';

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required?: boolean;
}

export interface FormSettings {
    organizationId: string;
    fields: FormField[];
}

export interface Task {
    id: string;
    organizationId: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    description?: string;
    assignedTo?: string;
    customFields: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

interface Data {
    tasks: Task[];
    settings: FormSettings[];
}

// ============== HELPERS ==============

function createDefaultSettings(organizationId: string): FormSettings {
    return {
        organizationId,
        fields: [
            { id: 'title', label: 'Title', type: 'text', required: true },
            { id: 'description', label: 'Description', type: 'text' },
            { id: 'status', label: 'Status', type: 'text', required: true },
            { id: 'priority', label: 'Priority', type: 'text', required: true },
            { id: 'dueDate', label: 'Due Date', type: 'date' },
            { id: 'assignedTo', label: 'Assigned To', type: 'email' }
        ]
    };
}

// ============== DB OPERATIONS ==============

async function readDB(): Promise<Data> {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { tasks: [], settings: [] };
    }
}

async function writeDB(data: Data): Promise<void> {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// ============== TASK CRUD ==============

export async function getTasks(organizationId: string): Promise<Task[]> {
    const db = await readDB();
    return db.tasks
        .filter(t => t.organizationId === organizationId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getTaskById(id: string): Promise<Task | undefined> {
    const db = await readDB();
    return db.tasks.find(t => t.id === id);
}

export async function insertTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const db = await readDB();
    const now = new Date().toISOString();

    const newTask: Task = {
        id: uuidv4(),
        ...task,
        createdAt: now,
        updatedAt: now
    };

    db.tasks.push(newTask);
    await writeDB(db);

    return newTask;
}

export async function updateTask(updatedTask: Task): Promise<Task | null> {
    const db = await readDB();
    const index = db.tasks.findIndex(t => t.id === updatedTask.id);

    if (index === -1) return null;

    db.tasks[index] = {
        ...updatedTask,
        updatedAt: new Date().toISOString()
    };
    await writeDB(db);

    return db.tasks[index];
}

export async function deleteTask(id: string): Promise<boolean> {
    const db = await readDB();
    const before = db.tasks.length;
    db.tasks = db.tasks.filter(t => t.id !== id);
    await writeDB(db);

    return db.tasks.length < before;
}

export async function bulkDeleteTasks(ids: string[]): Promise<void> {
    const db = await readDB();
    db.tasks = db.tasks.filter(t => !ids.includes(t.id));
    await writeDB(db);
}

// ============== FORM SETTINGS ==============

export async function getFormSettings(organizationId: string): Promise<FormSettings> {
    const db = await readDB();
    const settings = db.settings.find(s => s.organizationId === organizationId);
    return settings ?? createDefaultSettings(organizationId);
}

export async function saveFormSettings(newSettings: FormSettings): Promise<FormSettings> {
    const db = await readDB();
    const index = db.settings.findIndex(s => s.organizationId === newSettings.organizationId);

    if (index !== -1) {
        db.settings[index] = newSettings;
    } else {
        db.settings.push(newSettings);
    }

    await writeDB(db);
    return newSettings;
}

