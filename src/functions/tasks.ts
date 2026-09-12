import { app } from '@azure/functions';
import { verifyCosmosConnection } from '../config/cosmos';
import { errorResponse, jsonResponse } from '../shared/http';
import { createFunctionDependencies } from './dependencies';

const { config, taskController, formSettingsController } = createFunctionDependencies();

app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'tasks',
  handler: (request, context) => taskController.getAll(request, context)
});

app.http('getTaskById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'tasks/{id}',
  handler: (request, context) => taskController.getById(request, context)
});

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tasks',
  handler: (request, context) => taskController.create(request, context)
});

app.http('updateTask', {
  methods: ['PATCH'],
  authLevel: 'function',
  route: 'tasks/{id}',
  handler: (request, context) => taskController.update(request, context)
});

app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'tasks/{id}',
  handler: (request, context) => taskController.delete(request, context)
});

app.http('getFormSettings', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'form-settings',
  handler: (request, context) => formSettingsController.get(request, context)
});

app.http('saveFormSettings', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'form-settings',
  handler: (request, context) => formSettingsController.save(request, context)
});

app.http('health', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'health',
  handler: async (_request, context) => {
    try {
      await verifyCosmosConnection();
      return jsonResponse(200, { status: 'ok', storage: config.storageMode, cosmos: config.storageMode === 'cosmos' ? 'reachable' : 'skipped' });
    } catch (error) {
      return errorResponse(error, context);
    }
  }
});
