import { HttpRequest } from '@azure/functions';
import { BadRequestError } from './errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads a required query parameter and rejects the request early if
 * it's missing. Centralizing this avoids repeating
 * `request.query.get(...)` + manual null checks in every function.
 */
export function requireQueryParam(request: HttpRequest, name: string): string {
    const value = request.query.get(name);

    if (!value || value.trim().length === 0) {
        throw new BadRequestError(`Missing required query parameter: "${name}".`);
    }

    return value;
}

/**
 * Validates that a value looks like a UUID before it's ever used to
 * build a Cosmos DB query or point-read, as a defense-in-depth
 * measure alongside parameterized queries.
 */
export function requireUuidQueryParam(request: HttpRequest, name: string): string {
    const value = requireQueryParam(request, name);

    if (!UUID_REGEX.test(value)) {
        throw new BadRequestError(`Query parameter "${name}" must be a valid UUID.`);
    }

    return value;
}

/**
 * Reads a required route parameter (e.g. `{id}` in `tasks/{id}`).
 * Used instead of a query param for resource identifiers, which is
 * more RESTful and matches the route templates registered below.
 */
export function requireRouteParam(request: HttpRequest, name: string): string {
    const value = request.params[name];

    if (!value || value.trim().length === 0) {
        throw new BadRequestError(`Missing required route parameter: "${name}".`);
    }

    return value;
}

export function parsePositiveIntOrDefault(value: string | null, fallback: number, max?: number): number {
    if (!value) return fallback;

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }

    return max ? Math.min(parsed, max) : parsed;
}