import { TaskPriority, TaskStatus } from '../types/task';
import { FieldType, ALLOWED_FIELD_TYPES } from '../config/constants';

const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'completed'];

export function isValidPriority(value: string): value is TaskPriority {
  return VALID_PRIORITIES.includes(value as TaskPriority);
}

export function isValidStatus(value: string): value is TaskStatus {
  return VALID_STATUSES.includes(value as TaskStatus);
}

export function isValidFieldType(value: string): value is FieldType {
  return ALLOWED_FIELD_TYPES.includes(value as FieldType);
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function validateRequiredFields(data: Record<string, any>, fields: string[]): string[] {
  const missing: string[] = [];
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  return missing;
}
