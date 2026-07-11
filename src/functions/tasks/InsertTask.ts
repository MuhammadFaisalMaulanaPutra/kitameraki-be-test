import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';
import { generateUUID, validateRequiredFields } from '../../utils/validators';
import { CreateTaskPayload } from '../../types/task';

const insertTaskHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`InsertTask: Processing request for url "${request.url}"`);

  const body = (await request.json()) as CreateTaskPayload;

  const missingFields = validateRequiredFields(body, ['title', 'status']);
  if (missingFields.length > 0) {
    return errorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400);
  }

  const task = {
    id: generateUUID(),
    organizationId: CONSTANTS.DEFAULT_ORG_ID,
    title: body.title,
    description: body.description || '',
    dueDate: body.dueDate || null,
    priority: body.priority || 'medium',
    status: body.status,
    tags: body.tags || [],
    dynamicData: body.dynamicData || {},
  };

  const container = await getTasksContainer();
  const { resource } = await container.items.create(task);

  return successResponse(resource, 201);
};

export const InsertTask = withErrorHandling(insertTaskHandler);

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: InsertTask,
});
