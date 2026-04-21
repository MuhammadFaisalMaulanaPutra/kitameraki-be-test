export interface TaskResponseDTO {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    status: "todo" | "doing" | "done";
    createdAt: string;
    updatedAt?: string;
}

export interface TaskListResponseDTO {
    data: TaskResponseDTO[];
    pagination: {
        continuationToken?: string;
        hasNext: boolean;
    };
}

export interface MessageResponseDTO {
    message: string;
}