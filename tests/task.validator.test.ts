import { createTaskSchema, updateTaskSchema } from '../src/validators/task.validator';

describe('task validation', () => {
  it('applies defaults for a valid task', () => {
    expect(createTaskSchema.parse({ title: 'Write docs' })).toMatchObject({
      title: 'Write docs',
      status: 'todo',
      priority: 'medium'
    });
  });

  it('rejects unknown fields', () => {
    expect(createTaskSchema.safeParse({ title: 'Task', unexpected: true }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });
});
