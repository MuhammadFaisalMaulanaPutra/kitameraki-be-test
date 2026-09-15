import { z } from 'zod';

const environmentSchema = z
  .object({
    AZURE_FUNCTIONS_ENVIRONMENT: z
      .enum(['Development', 'Staging', 'Production'])
      .default('Development'),
    ORGANIZATION_ID: z.uuid(),
    COSMOS_ENDPOINT: z.url().optional(),
    COSMOS_CONNECTION_STRING: z.string().min(1).optional(),
    COSMOS_DATABASE_NAME: z.string().min(1).default('TaskApp'),
    COSMOS_TASKS_CONTAINER_NAME: z.string().min(1).default('Tasks'),
    COSMOS_FORM_SETTINGS_CONTAINER_NAME: z.string().min(1).default('FormSettings'),
    ALLOWED_ORIGIN: z.url().default('http://localhost:5173'),
    MAX_REQUEST_BODY_BYTES: z.coerce.number().int().min(1024).max(1048576).default(262144),
    SLOW_COSMOS_OPERATION_MS: z.coerce.number().int().min(1).max(60000).default(250),
  })
  .superRefine((value, context) => {
    const credentials = [value.COSMOS_ENDPOINT, value.COSMOS_CONNECTION_STRING].filter(Boolean);
    if (credentials.length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Set exactly one of COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING.',
      });
    }

    if (value.AZURE_FUNCTIONS_ENVIRONMENT === 'Production') {
      if (value.COSMOS_CONNECTION_STRING) {
        context.addIssue({
          code: 'custom',
          path: ['COSMOS_CONNECTION_STRING'],
          message: 'COSMOS_CONNECTION_STRING is only allowed for local development.',
        });
      }
      if (!value.COSMOS_ENDPOINT || new URL(value.COSMOS_ENDPOINT).protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          path: ['COSMOS_ENDPOINT'],
          message: 'COSMOS_ENDPOINT must use HTTPS in production.',
        });
      }
      if (new URL(value.ALLOWED_ORIGIN).protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          path: ['ALLOWED_ORIGIN'],
          message: 'ALLOWED_ORIGIN must use HTTPS in production.',
        });
      }
    }
  });

export type AppConfig = Readonly<z.infer<typeof environmentSchema>>;
let cachedConfig: AppConfig | undefined;

export const getConfig = (): AppConfig => {
  if (!cachedConfig) cachedConfig = environmentSchema.parse(process.env);
  return cachedConfig;
};

export const resetConfigForTests = (): void => {
  cachedConfig = undefined;
};
