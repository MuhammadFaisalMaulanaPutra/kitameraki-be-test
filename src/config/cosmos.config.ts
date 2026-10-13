export const COSMOS_CONFIG = {
  DATABASE_ID: "TaskApp",
  CONTAINERS: {
    TASKS: "Tasks",
    FORM_SETTINGS: "FormSettings",
  },
  PARTITION_KEYS: {
    TASKS: "/organizationId",
    FORM_SETTINGS: "/organizationId",
  },
} as const;
