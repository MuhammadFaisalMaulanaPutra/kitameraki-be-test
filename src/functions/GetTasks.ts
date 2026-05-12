import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { listTasks } from '../services/taskService';
import { parseOrganizationId, parsePagination, parseStatus } from '../validators/taskValidator';

export async function GetTasks(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const { pageNumber, pageSize } = parsePagination(request.query.get('pageNumber'), request.query.get('pageSize'));
    const status = parseStatus(request.query.get('status'));
    const searchTerm = request.query.get('searchTerm') ?? undefined;
    const sortField = request.query.get('sortBy') ?? 'createdAt';
    const sortOrder = (request.query.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const client = getCosmosClient();
    const result = await listTasks(client, organizationId, pageNumber, pageSize, status, searchTerm, sortField, sortOrder);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTasks,
});
