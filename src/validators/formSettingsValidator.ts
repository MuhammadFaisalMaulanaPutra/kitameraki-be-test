import { ERROR_MESSAGES } from "../constants";
import { FormField, FieldType } from "../interfaces/FormSettings.interface";
import { ValidationError } from "../libs/errorHandling";

const VALID_FIELD_TYPES: FieldType[] = ["text", "date", "datetime", "email"];

export function validateFormField(field: any): FormField {
  if (!field.id || typeof field.id !== "string") {
    throw new ValidationError(ERROR_MESSAGES.FIELD_ID_REQUIRED);
  }

  if (!field.label || typeof field.label !== "string") {
    throw new ValidationError(ERROR_MESSAGES.FIELD_LABEL_REQUIRED);
  }

  if (!field.type || !VALID_FIELD_TYPES.includes(field.type)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_FIELD_TYPE);
  }

  if (field.required !== undefined && typeof field.required !== "boolean") {
    throw new ValidationError("Field required must be a boolean");
  }

  if (field.column !== undefined && (field.column !== 0 && field.column !== 1)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_COLUMN);
  }

  if (field.order !== undefined && (typeof field.order !== "number" || field.order < 0)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_ORDER);
  }

  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required || false,
    column: field.column !== undefined ? field.column : 0,
    order: field.order !== undefined ? field.order : 0,
  };
}

export function validateFormSettingsBody(body: any): { fields: FormField[] } {
  if (!body.fields || !Array.isArray(body.fields)) {
    throw new ValidationError(ERROR_MESSAGES.FIELDS_ARRAY_REQUIRED);
  }

  const validatedFields = body.fields.map((field: any, index: number) => {
    try {
      return validateFormField(field);
    } catch (error) {
      throw new ValidationError(`Invalid field at index ${index}: ${(error as Error).message}`);
    }
  });

  return { fields: validatedFields };
}
