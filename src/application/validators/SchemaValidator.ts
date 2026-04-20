import { z } from "zod";
import { ValidationError } from "../../domain/errors/DomainError";

export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorDetails = error.issues.map(e => ({ 
                path: e.path.join('.'), 
                message: e.message 
            }));
            const messages = errorDetails.map(e => `${e.path}: ${e.message}`).join("; ");
            throw new ValidationError(messages, errorDetails);
        }
        throw error;
    }
}