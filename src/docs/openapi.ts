import {
  BUTTON_ACTIONS,
  COMPUTE_ON,
  CORE_KEY_ALLOWED_TYPES,
  createTemplateRows,
  FIELD_TYPES,
  FORM_SETTINGS_SCHEMA_VERSION,
  GRID_COLUMNS,
  IFRAME_SECURITY_FLAGS,
  MAX_FIELDS_PER_ROW,
  MAX_NESTING_DEPTH,
  MIN_FIELD_COLUMNS,
  TIME_INTERVALS,
  VALIDATION_PATTERNS,
  VERTICAL_ALIGNMENTS,
} from '../models/form-settings.model';
import { TASK_SORTABLE_FIELDS } from '../models/task.model';

const DEFAULT_ORGANIZATION_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
const IDENTIFIER_PATTERN = '^[A-Za-z][A-Za-z0-9_-]{0,63}$';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name: string) => ({ $ref: `#/components/responses/${name}` });

const successEnvelope = (data: object, withMeta = false) => ({
  type: 'object',
  required: ['success', 'message', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data,
    ...(withMeta && { meta: ref('PaginationMeta') }),
  },
});

const jsonContent = (schema: object) => ({ 'application/json': { schema } });

const fieldValue = {
  oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: { type: 'string' } }],
};

/** FEEL expression: evaluated in the browser, the API only checks the shape. */
const feel = (description: string) => ({
  type: 'string',
  maxLength: 500,
  pattern: '^=\\s*\\S',
  description: `${description} (FEEL expression starting with "=", evaluated in the browser)`,
});

const coreKeysDescription = Object.entries(CORE_KEY_ALLOWED_TYPES)
  .map(([key, types]) => `\`${key}\` (${types.join(' / ')})`)
  .join(', ');

/**
 * Which properties are accepted / required and which values they take is defined by the form settings
 * (e.g. status and priority accept the option values of their Select components).
 */
const taskInputProperties = {
  title: { type: 'string', maxLength: 100, nullable: true, example: 'Prepare sprint demo' },
  description: { type: 'string', maxLength: 1000, nullable: true, example: 'Slides + live demo of the task board' },
  dueDate: {
    type: 'string',
    nullable: true,
    description: 'ISO 8601 date-time (Date & time component) or YYYY-MM-DD (Date component)',
    example: '2026-12-01T09:00:00.000Z',
  },
  priority: { type: 'string', nullable: true, description: 'One of the Priority options', example: 'high' },
  status: { type: 'string', nullable: true, description: 'One of the Status options', example: 'todo' },
  tags: { type: 'array', maxItems: 20, nullable: true, items: { type: 'string', maxLength: 50 }, example: ['demo'] },
  customFields: {
    type: 'object',
    description:
      'Values of the other form components keyed by their key. `null` or "" clears a value. ' +
      'Groups with a path hold an object, dynamic lists a list of objects, file pickers a list of FileReference, ' +
      'expressions any JSON value. Limits: depth 8, strings 1000 chars, lists 100 items, objects 100 keys.',
    additionalProperties: ref('JsonValue'),
    example: {
      reviewerEmail: 'reviewer@example.com',
      client: { name: 'Acme', tier: 'gold' },
      checklist: [{ item: 'Slides', done: true }],
      attachments: [
        { id: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c', name: 'brief.pdf', size: 52344, contentType: 'application/pdf' },
      ],
    },
  },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Task Management API',
    version: '3.0.0',
    description:
      'REST API for the Kitameraki Task Management App. Built with Express + Azure Cosmos DB + Azure Blob Storage and deployable to Azure Function App.\n\n' +
      'Every `/tasks`, `/form-settings` and `/files` request is scoped to an organization through the `x-organization-id` header.\n\n' +
      '**Status codes**: `200` OK, `201` Created, `204` No Content, `400` Bad Request (malformed JSON, invalid header / query / id), ' +
      '`404` Not Found, `413` Payload too large, `422` Validation error, `429` Too many requests, `500` Internal server error.',
  },
  servers: [{ url: '/api', description: 'Current host' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Tasks', description: 'Task CRUD, search, filter and pagination' },
    { name: 'Form Settings', description: 'Customizable task form (Part 2, bpmn.io form-js components)' },
    { name: 'Files', description: 'Files of File picker values (Azure Blob Storage)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is up',
            content: jsonContent(
              successEnvelope({
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  uptimeSeconds: { type: 'integer', example: 42 },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              }),
            ),
          },
        },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks (search, filter, sort, paginate)',
        parameters: [
          { $ref: '#/components/parameters/OrganizationId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          {
            name: 'search',
            in: 'query',
            description: 'Case-insensitive search in title, description and tags',
            schema: { type: 'string', maxLength: 100 },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Status option value',
            schema: { type: 'string', maxLength: 50 },
          },
          {
            name: 'priority',
            in: 'query',
            description: 'Priority option value',
            schema: { type: 'string', maxLength: 50 },
          },
          { name: 'tag', in: 'query', description: 'Exact tag match', schema: { type: 'string', maxLength: 50 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: TASK_SORTABLE_FIELDS, default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: {
            description: 'Paginated list of tasks',
            content: jsonContent(successEnvelope({ type: 'array', items: ref('Task') }, true)),
          },
          400: responseRef('BadRequest'),
          500: responseRef('InternalServerError'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        parameters: [{ $ref: '#/components/parameters/OrganizationId' }],
        requestBody: { required: true, content: jsonContent(ref('TaskInput')) },
        responses: {
          201: {
            description: 'Task created',
            headers: { Location: { schema: { type: 'string' }, description: 'URL of the new task' } },
            content: jsonContent(successEnvelope(ref('Task'))),
          },
          400: responseRef('BadRequest'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
    },
    '/tasks/bulk-delete': {
      post: {
        tags: ['Tasks'],
        summary: 'Delete several tasks at once',
        parameters: [{ $ref: '#/components/parameters/OrganizationId' }],
        requestBody: { required: true, content: jsonContent(ref('BulkDeleteInput')) },
        responses: {
          200: {
            description: 'Deletion summary',
            content: jsonContent(successEnvelope(ref('BulkDeleteResult'))),
          },
          400: responseRef('BadRequest'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
    },
    '/tasks/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrganizationId' }, { $ref: '#/components/parameters/TaskId' }],
      get: {
        tags: ['Tasks'],
        summary: 'Get a task by id',
        responses: {
          200: { description: 'The task', content: jsonContent(successEnvelope(ref('Task'))) },
          400: responseRef('BadRequest'),
          404: responseRef('NotFound'),
          500: responseRef('InternalServerError'),
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Replace all editable fields of a task',
        requestBody: { required: true, content: jsonContent(ref('TaskInput')) },
        responses: {
          200: { description: 'Updated task', content: jsonContent(successEnvelope(ref('Task'))) },
          400: responseRef('BadRequest'),
          404: responseRef('NotFound'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Partially update a task (e.g. change status)',
        requestBody: { required: true, content: jsonContent(ref('TaskPatchInput')) },
        responses: {
          200: { description: 'Updated task', content: jsonContent(successEnvelope(ref('Task'))) },
          400: responseRef('BadRequest'),
          404: responseRef('NotFound'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        responses: {
          204: { description: 'Task deleted' },
          400: responseRef('BadRequest'),
          404: responseRef('NotFound'),
          500: responseRef('InternalServerError'),
        },
      },
    },
    '/form-settings': {
      parameters: [{ $ref: '#/components/parameters/OrganizationId' }],
      get: {
        tags: ['Form Settings'],
        summary: 'Get the task form settings (the task template when never saved)',
        responses: {
          200: { description: 'Current settings', content: jsonContent(successEnvelope(ref('FormSettings'))) },
          400: responseRef('BadRequest'),
          500: responseRef('InternalServerError'),
        },
      },
      put: {
        tags: ['Form Settings'],
        summary: 'Save the task form settings',
        description:
          'Validation errors point into the component tree, e.g. `rows.4.fields.0.rows.1.fields.0.key`. ' +
          'Keys are unique per scope (the form, and each group with a path / dynamic list).',
        requestBody: { required: true, content: jsonContent(ref('FormSettingsInput')) },
        responses: {
          200: { description: 'Saved settings', content: jsonContent(successEnvelope(ref('FormSettings'))) },
          400: responseRef('BadRequest'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
    },
    '/files': {
      post: {
        tags: ['Files'],
        summary: 'Upload a file (File picker)',
        description:
          'Send `multipart/form-data` with one part named `file`. The returned reference is what a File picker value ' +
          'stores in `customFields`. Maximum size: `FILE_MAX_SIZE_BYTES` (default 5 MB).',
        parameters: [{ $ref: '#/components/parameters/OrganizationId' }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'File stored',
            headers: { Location: { schema: { type: 'string' }, description: 'URL of the file' } },
            content: jsonContent(successEnvelope(ref('FileReference'))),
          },
          400: responseRef('BadRequest'),
          413: responseRef('PayloadTooLarge'),
          422: responseRef('ValidationError'),
          500: responseRef('InternalServerError'),
        },
      },
    },
    '/files/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrganizationId' }, { $ref: '#/components/parameters/FileId' }],
      get: {
        tags: ['Files'],
        summary: 'Download a file',
        description:
          'Always served as an attachment with `Content-Security-Policy: sandbox`, so uploaded content never runs in the app origin.',
        responses: {
          200: {
            description: 'The file content',
            headers: {
              'Content-Type': { schema: { type: 'string' }, description: 'Content type of the upload' },
              'Content-Length': { schema: { type: 'integer' } },
              'Content-Disposition': {
                schema: { type: 'string' },
                description: "`attachment; filename*=UTF-8''<encoded name>`",
              },
              'Content-Security-Policy': { schema: { type: 'string', example: 'sandbox' } },
              'Cache-Control': { schema: { type: 'string', example: 'private, no-store' } },
            },
            content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
          },
          400: responseRef('BadRequest'),
          404: responseRef('NotFound'),
          500: responseRef('InternalServerError'),
        },
      },
    },
  },
  components: {
    parameters: {
      OrganizationId: {
        name: 'x-organization-id',
        in: 'header',
        required: true,
        description: 'Tenant (organization) the request belongs to',
        schema: { type: 'string', format: 'uuid', example: DEFAULT_ORGANIZATION_ID },
      },
      TaskId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      FileId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    schemas: {
      Task: {
        type: 'object',
        required: ['id', 'organizationId', 'tags', 'customFields', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          organizationId: { type: 'string', format: 'uuid' },
          ...taskInputProperties,
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TaskInput: {
        type: 'object',
        description: 'Required properties depend on the form settings (template: title and status).',
        additionalProperties: false,
        properties: taskInputProperties,
      },
      TaskPatchInput: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: taskInputProperties,
        example: { status: 'in-progress' },
      },
      BulkDeleteInput: {
        type: 'object',
        required: ['ids'],
        additionalProperties: false,
        properties: { ids: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', format: 'uuid' } } },
      },
      BulkDeleteResult: {
        type: 'object',
        properties: {
          deletedIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          notFoundIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
      FieldOption: {
        type: 'object',
        required: ['label', 'value'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 100, example: 'In Review' },
          value: { type: 'string', minLength: 1, maxLength: 50, example: 'in-review' },
        },
      },
      FormField: {
        type: 'object',
        required: ['id', 'type'],
        additionalProperties: false,
        description:
          'A form component (bpmn.io form-js 2.1.1). Value components (input + selection types, `expression`) need a `key`; ' +
          'data components and buttons need a `label`. Keys are unique per scope; core keys bind to task properties in the ' +
          `root scope only: ${coreKeysDescription}. Groups / dynamic lists hold \`rows\` (nesting up to ${MAX_NESTING_DEPTH} levels). ` +
          'Properties marked FEEL are evaluated in the browser; text properties may contain {{ }} templates.',
        properties: {
          id: { type: 'string', pattern: IDENTIFIER_PATTERN, example: 'field_status' },
          type: { type: 'string', enum: FIELD_TYPES, example: 'select' },
          key: { type: 'string', pattern: IDENTIFIER_PATTERN, example: 'status' },
          path: {
            type: 'string',
            pattern: IDENTIFIER_PATTERN,
            description: 'Group (optional) / dynamic list (required): child values are nested under this key',
          },
          label: { type: 'string', maxLength: 100, example: 'Status' },
          description: { type: 'string', maxLength: 300 },
          placeholder: { type: 'string', maxLength: 200 },
          defaultValue: fieldValue,
          required: { type: 'boolean', description: 'Not enforced while the component (or a container) is hidden' },
          disabled: { type: 'boolean' },
          readOnly: { oneOf: [{ type: 'boolean' }, feel('Read-only condition')] },
          searchable: { type: 'boolean', description: 'Select only' },
          options: { type: 'array', maxItems: 100, items: ref('FieldOption'), description: 'Options source "Static"' },
          valuesKey: { type: 'string', pattern: IDENTIFIER_PATTERN, description: 'Options source "Input data"' },
          valuesExpression: feel('Options source "Expression"'),
          prefix: { type: 'string', maxLength: 20 },
          suffix: { type: 'string', maxLength: 20 },
          validation: {
            type: 'object',
            additionalProperties: false,
            properties: {
              minLength: { type: 'integer' },
              maxLength: { type: 'integer' },
              pattern: { type: 'string', enum: VALIDATION_PATTERNS },
              customPattern: { type: 'string', maxLength: 200 },
              min: { type: 'number' },
              max: { type: 'number' },
            },
          },
          disallowPastDates: { type: 'boolean', description: 'Date / Date & time' },
          use24h: { type: 'boolean', description: 'Time / Date & time' },
          timeInterval: { type: 'integer', enum: TIME_INTERVALS, description: 'Time / Date & time (minutes)' },
          decimalDigits: { type: 'integer', minimum: 0, maximum: 10, description: 'Number' },
          increment: { type: 'number', description: 'Number' },
          text: { type: 'string', maxLength: 5000, description: 'Text view (Markdown + templates)' },
          content: { type: 'string', maxLength: 10000, description: 'HTML view (sanitized in the browser)' },
          height: { type: 'integer', description: 'Spacer 8-400, iFrame 50-2000 (px)' },
          expression: feel('Expression: target value'),
          computeOn: { type: 'string', enum: COMPUTE_ON, description: 'Expression (default: change)' },
          accept: {
            type: 'string',
            maxLength: 200,
            description: 'File picker: supported formats, e.g. ".pdf,image/*"',
          },
          multiple: { type: 'boolean', description: 'File picker: up to 10 files' },
          source: { type: 'string', maxLength: 2000, description: 'Image view: http(s) URL, data:image URI or FEEL' },
          alt: { type: 'string', maxLength: 200, description: 'Image view' },
          url: { type: 'string', maxLength: 2000, description: 'iFrame: https URL or FEEL' },
          security: {
            type: 'object',
            additionalProperties: false,
            description: 'iFrame security attributes',
            properties: Object.fromEntries(IFRAME_SECURITY_FLAGS.map((flag) => [flag, { type: 'boolean' }])),
          },
          dataSource: feel('Table / Document preview: data'),
          rowCount: { type: 'integer', minimum: 1, maximum: 100, description: 'Table: rows per page' },
          columns: {
            type: 'array',
            maxItems: 30,
            description: 'Table: static header items (or `columnsExpression`)',
            items: {
              type: 'object',
              required: ['label', 'key'],
              additionalProperties: false,
              properties: {
                label: { type: 'string', minLength: 1, maxLength: 100 },
                key: { type: 'string', pattern: IDENTIFIER_PATTERN },
              },
            },
          },
          columnsExpression: feel('Table: header items'),
          maxHeight: { type: 'integer', minimum: 50, maximum: 2000, description: 'Document preview (px)' },
          showOutline: { type: 'boolean', description: 'Group / dynamic list' },
          verticalAlignment: { type: 'string', enum: VERTICAL_ALIGNMENTS, description: 'Group / dynamic list' },
          defaultRepetitions: { type: 'integer', minimum: 0, maximum: 50, description: 'Dynamic list' },
          allowAddRemove: { type: 'boolean', description: 'Dynamic list' },
          disableCollapse: { type: 'boolean', description: 'Dynamic list' },
          nonCollapsedItems: { type: 'integer', minimum: 1, maximum: 50, description: 'Dynamic list' },
          action: { type: 'string', enum: BUTTON_ACTIONS, description: 'Button' },
          conditional: {
            type: 'object',
            additionalProperties: false,
            properties: { hide: feel('Hide if') },
          },
          layout: {
            type: 'object',
            additionalProperties: false,
            properties: {
              columns: {
                type: 'integer',
                minimum: MIN_FIELD_COLUMNS,
                maximum: GRID_COLUMNS,
                description: `Columns of the ${GRID_COLUMNS}-column grid (auto = ${MIN_FIELD_COLUMNS} minimum)`,
              },
            },
          },
          properties: {
            type: 'object',
            maxProperties: 50,
            description: 'Custom properties (not interpreted by the app)',
            additionalProperties: { type: 'string', maxLength: 500 },
          },
          rows: { type: 'array', items: ref('FormRow'), description: 'Group / dynamic list content' },
        },
      },
      FormRow: {
        type: 'object',
        required: ['id', 'fields'],
        additionalProperties: false,
        description: `1-${MAX_FIELDS_PER_ROW} components; the columns of a row must fit the ${GRID_COLUMNS}-column grid`,
        properties: {
          id: { type: 'string', example: 'row_1' },
          fields: { type: 'array', minItems: 1, maxItems: MAX_FIELDS_PER_ROW, items: ref('FormField') },
        },
      },
      FormSettings: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'task-form' },
          organizationId: { type: 'string', format: 'uuid' },
          schemaVersion: {
            type: 'integer',
            example: FORM_SETTINGS_SCHEMA_VERSION,
            description: 'Older documents (v1, v2) are migrated when read',
          },
          versionTag: { type: 'string', maxLength: 50 },
          rows: { type: 'array', items: ref('FormRow') },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      FormSettingsInput: {
        type: 'object',
        required: ['rows'],
        additionalProperties: false,
        properties: {
          rows: { type: 'array', maxItems: 500, items: ref('FormRow') },
          versionTag: { type: 'string', maxLength: 50 },
        },
        example: { versionTag: 'v1', rows: createTemplateRows() },
      },
      JsonValue: {
        nullable: true,
        description: 'Any JSON value (string, number, boolean, object, array or null)',
      },
      FileReference: {
        type: 'object',
        required: ['id', 'name', 'size', 'contentType'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 255, example: 'brief.pdf' },
          size: { type: 'integer', minimum: 0, example: 52344 },
          contentType: { type: 'string', maxLength: 255, example: 'application/pdf' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          totalItems: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { field: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Malformed request (invalid JSON, header, id or query parameter)',
        content: jsonContent(ref('ErrorResponse')),
      },
      NotFound: { description: 'Resource not found', content: jsonContent(ref('ErrorResponse')) },
      PayloadTooLarge: { description: 'File over the configured limit', content: jsonContent(ref('ErrorResponse')) },
      ValidationError: { description: 'Request body failed validation', content: jsonContent(ref('ErrorResponse')) },
      InternalServerError: { description: 'Unexpected server error', content: jsonContent(ref('ErrorResponse')) },
    },
  },
};
