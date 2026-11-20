import { PatchOperation } from "@azure/cosmos";

export async function ignoreNotFound<T>(promise: Promise<T>): Promise<T | null> {
    try {
        return await promise;
    } catch (error: any) {
        if (error.statusCode === 404) return null;
        throw error;
    }
}

interface PatchOptions {
    excludeKeys?: string[];
    trackUpdatedAt?: boolean;
}

export function toPatchOperations(
    updates: Record<string, any>,
    options: PatchOptions = {}
): PatchOperation[] {
    const { excludeKeys = ['id', 'organizationId'], trackUpdatedAt = true } = options;
    const operations: PatchOperation[] = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && !excludeKeys.includes(key)) {
            operations.push({
                op: 'set',
                path: `/${key}`,
                value: value,
            });
        }
    }

    if (operations.length > 0 && trackUpdatedAt) {
        operations.push({
            op: 'set',
            path: '/updatedAt',
            value: new Date().toISOString(),
        });
    }
    return operations;
}