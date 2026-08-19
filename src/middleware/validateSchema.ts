import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import taskSchema from '../../task.schema.json';
import formSettingsSchema from '../../formSettings.schema.json';
import { ValidationError } from '../utils/errors';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

// Client-side create input: server owns id and organizationId.
const createTaskSchema = {
    ...taskSchema,
    required: ['title', 'status'],
    properties: {
        ...(taskSchema as any).properties,
    },
};
delete (createTaskSchema.properties as any).id;
delete (createTaskSchema.properties as any).organizationId;

// Client-side update input: every mutable task field is optional.
const updateTaskSchema = {
    ...taskSchema,
    properties: {
        ...(taskSchema as any).properties,
    },
    required: [],
};
delete (updateTaskSchema.properties as any).id;
delete (updateTaskSchema.properties as any).organizationId;

// Client-side form settings input: server owns id, organizationId
// and updatedAt. `fields[].id` is optional here — the service
// assigns one server-side for brand-new fields and preserves the
// existing id for fields the client is only renaming/reordering.
const updateFormSettingsSchema = {
    ...formSettingsSchema,
    required: ['fields'],
    properties: {
        ...(formSettingsSchema as any).properties,
        fields: {
            ...(formSettingsSchema as any).properties.fields,
            items: {
                ...(formSettingsSchema as any).properties.fields.items,
                required: ['label', 'type', 'row', 'column'],
            },
        },
    },
};
delete (updateFormSettingsSchema.properties as any).id;
delete (updateFormSettingsSchema.properties as any).organizationId;
delete (updateFormSettingsSchema.properties as any).updatedAt;

let validateCreate: ValidateFunction | undefined;
let validateUpdate: ValidateFunction | undefined;
let validateFormSettingsUpdate: ValidateFunction | undefined;

function formatErrors(validate: ValidateFunction): string[] {
    return (validate.errors ?? []).map((err) => `${err.instancePath || '(root)'} ${err.message}`);
}

function assertObject(body: unknown): void {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new ValidationError(['(root) must be an object']);
    }
}

export function validateCreateTaskInput(body: unknown): void {
    assertObject(body);

    if (!validateCreate) {
        validateCreate = ajv.compile(createTaskSchema);
    }

    if (!validateCreate(body)) {
        throw new ValidationError(formatErrors(validateCreate));
    }
}

export function validateUpdateTaskInput(body: unknown): void {
    assertObject(body);

    if (!validateUpdate) {
        validateUpdate = ajv.compile(updateTaskSchema);
    }

    if (!validateUpdate(body)) {
        throw new ValidationError(formatErrors(validateUpdate));
    }
}

export function validateUpdateFormSettingsInput(body: unknown): void {
    assertObject(body);

    if (!validateFormSettingsUpdate) {
        validateFormSettingsUpdate = ajv.compile(updateFormSettingsSchema);
    }

    if (!validateFormSettingsUpdate(body)) {
        throw new ValidationError(formatErrors(validateFormSettingsUpdate));
    }
}
