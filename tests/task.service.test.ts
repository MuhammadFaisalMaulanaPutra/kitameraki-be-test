import { InMemoryFormSettingsRepository } from '../src/repositories/in-memory-form-settings.repository';
import { InMemoryTaskRepository } from '../src/repositories/in-memory-task.repository';
import { FormSettings } from '../src/models/form-settings.model';
import { TaskService } from '../src/services/task.service';

function createService() {
  const settingsRepository = new InMemoryFormSettingsRepository();
  const taskRepository = new InMemoryTaskRepository();
  return { service: new TaskService(taskRepository, settingsRepository), settingsRepository };
}

describe('TaskService custom field validation', () => {
  it('rejects unknown custom fields and invalid email values', async () => {
    const { service, settingsRepository } = createService();
    const settings: FormSettings = {
      id: 'form-settings',
      updatedAt: new Date().toISOString(),
      fields: [{ id: 'email', key: 'email', label: 'Email', type: 'email', visible: true, required: true, column: 1, order: 0, system: false }]
    };
    await settingsRepository.save(settings);

    await expect(service.create({ title: 'Task', customFields: { email: 'invalid' } })).rejects.toThrow('valid email');
    await expect(service.create({ title: 'Task', customFields: { other: 'value' } })).rejects.toThrow('Unknown custom field');
  });

  it('accepts valid custom fields', async () => {
    const { service, settingsRepository } = createService();
    await settingsRepository.save({
      id: 'form-settings',
      updatedAt: new Date().toISOString(),
      fields: [{ id: 'email', key: 'email', label: 'Email', type: 'email', visible: true, required: true, column: 1, order: 0, system: false }]
    });

    await expect(service.create({ title: 'Task', customFields: { email: 'user@example.com' } })).resolves.toMatchObject({ title: 'Task' });
  });
});