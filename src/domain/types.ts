export interface QueryResult<T> {
    resources: T[];
    continuationToken?: string;
}

export interface BulkDeleteTaskResult {
    successIds: string[];
    failedIds: string[];
}