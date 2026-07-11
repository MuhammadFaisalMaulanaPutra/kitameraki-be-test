export const CONSTANTS = {
  DATABASE_NAME: 'TaskApp',
  CONTAINERS: {
    TASKS: 'Tasks',
    FORM_CONFIGS: 'FormConfigs',
  },
  DEFAULT_ORG_ID: 'org-default',
  DEFAULT_FORM_CONFIG_ID: 'default',
  DEFAULT_COLUMNS_PER_ROW: 2,
} as const;

export const ALLOWED_FIELD_TYPES = ['text', 'date', 'datetime', 'email'] as const;
export type FieldType = (typeof ALLOWED_FIELD_TYPES)[number];
