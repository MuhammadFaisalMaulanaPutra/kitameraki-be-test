export class Task {
    constructor(
        public id: string,
        public organizationId: string,
        public title: string,
        public description: string,
        public status: "todo" | "doing" | "done",
        public customFields: Record<string, any>,
        public createdAt: string,
        public updatedAt?: string
    ) {}

    static create(data: Partial<Task>): Task {
        return new Task(
            crypto.randomUUID(),
            data.organizationId!,
            data.title!,
            data.description || "",
            data.status || "todo",
            data.customFields || {},
            new Date().toISOString()
        );
    }
}