import type { ITaskRepository } from '../../../src/interfaces/task.repository.interface';
import { createTemplateRows, type FormRow } from '../../../src/models/form-settings.model';
import type { Task } from '../../../src/models/task.model';
import type { FormSettingsService } from '../../../src/services/form-settings.service';
import { TaskService } from '../../../src/services/task.service';
import { NotFoundError, ValidationError } from '../../../src/utils/errors';
import { createTaskSchema, listTasksQuerySchema } from '../../../src/validators/task.validator';
import {
  checklistList,
  clientGroup,
  reviewerEmailField,
  rowsOf,
  startDateField,
  templateWithCustomRows,
} from '../../helpers/form-fixtures';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
const TASK_ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-23T10:00:00.000Z');

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    organizationId: ORG_ID,
    title: 'Existing task',
    description: 'Some description',
    priority: 'medium',
    status: 'todo',
    tags: ['work'],
    customFields: { reviewerEmail: 'old@example.com', startDate: '2026-01-01' },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskService', () => {
  let repository: jest.Mocked<ITaskRepository>;
  let formSettingsService: jest.Mocked<Pick<FormSettingsService, 'getRows'>>;
  let service: TaskService;

  const useRows = (rows: FormRow[]) => formSettingsService.getRows.mockResolvedValue(rows);

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(async (task: Task) => task),
      update: jest.fn(async (task: Task) => task),
      delete: jest.fn(),
    };
    formSettingsService = { getRows: jest.fn().mockResolvedValue(createTemplateRows()) };
    service = new TaskService(
      repository,
      formSettingsService as unknown as FormSettingsService,
      () => NOW,
      () => TASK_ID,
    );
  });

  describe('listTasks', () => {
    it('passes filters, sorting and paging to the repository and builds pagination meta', async () => {
      repository.findMany.mockResolvedValue({ items: [buildTask()], totalItems: 21 });
      const query = listTasksQuerySchema.parse({ page: '2', pageSize: '10', search: 'Report', status: 'todo' });

      const result = await service.listTasks(ORG_ID, query);

      expect(repository.findMany).toHaveBeenCalledWith(ORG_ID, {
        filter: { search: 'report', status: 'todo', priority: undefined, tag: undefined },
        sort: { sortBy: 'createdAt', sortOrder: 'desc' },
        pagination: { page: 2, pageSize: 10 },
      });
      expect(result.meta).toEqual({ page: 2, pageSize: 10, totalItems: 21, totalPages: 3 });
    });

    it('returns zero pages when there are no tasks', async () => {
      repository.findMany.mockResolvedValue({ items: [], totalItems: 0 });
      const result = await service.listTasks(ORG_ID, listTasksQuerySchema.parse({}));
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('getTask', () => {
    it('returns the task when it exists', async () => {
      repository.findById.mockResolvedValue(buildTask());
      await expect(service.getTask(ORG_ID, TASK_ID)).resolves.toMatchObject({ id: TASK_ID });
    });

    it('throws NotFoundError when the task does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getTask(ORG_ID, TASK_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('createTask', () => {
    it('creates a task with server-generated id, timestamps and template defaults (status = todo)', async () => {
      const input = createTaskSchema.parse({ title: '  New task ', tags: ['a', 'a', 'b'] });

      const task = await service.createTask(ORG_ID, input);

      expect(task).toEqual({
        id: TASK_ID,
        organizationId: ORG_ID,
        title: 'New task',
        status: 'todo',
        tags: ['a', 'b'],
        customFields: {},
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      });
    });

    it('requires the fields marked as required in the form settings', async () => {
      const error = await service.createTask(ORG_ID, createTaskSchema.parse({ status: null })).catch((e) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([
        { field: 'title', message: 'Title is required' },
        { field: 'status', message: 'Status is required' },
      ]);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('only accepts option values configured in the settings', async () => {
      const error = await service
        .createTask(ORG_ID, createTaskSchema.parse({ title: 'x', status: 'done', priority: 'urgent' }))
        .catch((e) => e);

      expect(error.details).toEqual([
        { field: 'priority', message: 'Priority: Must be one of: low, medium, high' },
        { field: 'status', message: 'Status: Must be one of: todo, in-progress, completed' },
      ]);
    });

    it('accepts renamed / extra status options', async () => {
      useRows(
        rowsOf(
          { id: 'f_title', type: 'text', key: 'title', label: 'Name', required: true },
          {
            id: 'f_status',
            type: 'radio',
            key: 'status',
            label: 'State',
            options: [{ label: 'Blocked', value: 'blocked' }],
          },
        ),
      );

      const task = await service.createTask(ORG_ID, createTaskSchema.parse({ title: 'x', status: 'blocked' }));

      expect(task.status).toBe('blocked');
    });

    it('rejects values for fields that are not part of the form', async () => {
      useRows(rowsOf({ id: 'f_title', type: 'text', key: 'title', label: 'Title' }));

      const error = await service
        .createTask(ORG_ID, createTaskSchema.parse({ title: 'x', status: 'todo', customFields: { ghost: 'x' } }))
        .catch((e) => e);

      expect(error.details).toEqual([
        { field: 'status', message: 'Field is not part of the task form' },
        { field: 'customFields.ghost', message: 'Field is not part of the task form' },
      ]);
    });

    it('stores custom values by key and validates them by component type', async () => {
      useRows(templateWithCustomRows([reviewerEmailField, startDateField]));

      const invalid = await service
        .createTask(ORG_ID, createTaskSchema.parse({ title: 'x', customFields: { startDate: '2026-02-30' } }))
        .catch((e) => e);
      expect(invalid.details).toEqual([
        { field: 'customFields.reviewerEmail', message: 'Reviewer is required' },
        { field: 'customFields.startDate', message: 'Start: Must be a valid date (YYYY-MM-DD)' },
      ]);

      const task = await service.createTask(
        ORG_ID,
        createTaskSchema.parse({ title: 'x', customFields: { reviewerEmail: ' me@example.com ', startDate: '' } }),
      );
      expect(task.customFields).toEqual({ reviewerEmail: 'me@example.com' });
    });

    it('stores nested values of groups with a path and dynamic lists', async () => {
      useRows(templateWithCustomRows([clientGroup, checklistList]));

      const task = await service.createTask(
        ORG_ID,
        createTaskSchema.parse({
          title: 'x',
          customFields: { client: { name: 'Acme' }, checklist: [{ item: 'Slides', done: true }] },
        }),
      );

      expect(task.customFields).toEqual({
        client: { name: 'Acme', tier: 'standard' },
        checklist: [{ item: 'Slides', done: true }],
      });
    });
  });

  describe('replaceTask', () => {
    it('replaces every form value and clears the omitted optional ones', async () => {
      repository.findById.mockResolvedValue(buildTask());

      const task = await service.replaceTask(
        ORG_ID,
        TASK_ID,
        createTaskSchema.parse({ title: 'Replaced', status: 'completed' }),
      );

      expect(task).toMatchObject({
        id: TASK_ID,
        title: 'Replaced',
        status: 'completed',
        tags: [],
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: NOW.toISOString(),
      });
      expect(task.description).toBeUndefined();
      expect(task.priority).toBeUndefined();
    });

    it('does not re-check "disallow past dates" for an unchanged value', async () => {
      const pastDue = '2020-01-01T00:00:00.000Z';
      useRows(
        createTemplateRows().map((row) => ({
          ...row,
          fields: row.fields.map((field) => (field.key === 'dueDate' ? { ...field, disallowPastDates: true } : field)),
        })),
      );
      repository.findById.mockResolvedValue(buildTask({ dueDate: pastDue }));

      await expect(
        service.replaceTask(ORG_ID, TASK_ID, createTaskSchema.parse({ title: 'x', status: 'todo', dueDate: pastDue })),
      ).resolves.toMatchObject({ dueDate: pastDue });

      await expect(
        service.replaceTask(
          ORG_ID,
          TASK_ID,
          createTaskSchema.parse({ title: 'x', status: 'todo', dueDate: '2021-01-01T00:00:00.000Z' }),
        ),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws NotFoundError for an unknown task', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.replaceTask(ORG_ID, TASK_ID, createTaskSchema.parse({ title: 'x' }))).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('changes only the provided values (status change)', async () => {
      repository.findById.mockResolvedValue(buildTask());

      const task = await service.updateTask(ORG_ID, TASK_ID, { status: 'completed' });

      expect(task).toMatchObject({ status: 'completed', title: 'Existing task', priority: 'medium' });
      expect(task.updatedAt).toBe(NOW.toISOString());
    });

    it('clears optional values when null is provided', async () => {
      repository.findById.mockResolvedValue(buildTask());

      const task = await service.updateTask(ORG_ID, TASK_ID, { description: null, priority: null, tags: null });

      expect(task.description).toBeUndefined();
      expect(task.priority).toBeUndefined();
      expect(task.tags).toEqual([]);
    });

    it('merges custom values with the existing ones', async () => {
      useRows(templateWithCustomRows([reviewerEmailField, startDateField]));
      repository.findById.mockResolvedValue(buildTask());

      const task = await service.updateTask(ORG_ID, TASK_ID, { customFields: { startDate: null } });

      expect(task.customFields).toEqual({ reviewerEmail: 'old@example.com' });
    });

    it('rejects clearing a required value', async () => {
      repository.findById.mockResolvedValue(buildTask());
      await expect(service.updateTask(ORG_ID, TASK_ID, { title: '' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteTask', () => {
    it('resolves when the task was deleted', async () => {
      repository.delete.mockResolvedValue(true);
      await expect(service.deleteTask(ORG_ID, TASK_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundError when nothing was deleted', async () => {
      repository.delete.mockResolvedValue(false);
      await expect(service.deleteTask(ORG_ID, TASK_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('bulkDeleteTasks', () => {
    it('awaits every deletion and reports deleted and missing ids', async () => {
      repository.delete.mockImplementation(async (_org, id) => id !== 'missing');

      const result = await service.bulkDeleteTasks(ORG_ID, ['a', 'missing', 'b']);

      expect(repository.delete).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ deletedIds: ['a', 'b'], notFoundIds: ['missing'] });
    });

    it('propagates repository failures instead of silently ignoring them', async () => {
      repository.delete.mockRejectedValue(new Error('database down'));
      await expect(service.bulkDeleteTasks(ORG_ID, ['a'])).rejects.toThrow('database down');
    });
  });
});
