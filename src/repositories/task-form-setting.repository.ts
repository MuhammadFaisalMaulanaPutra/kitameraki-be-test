import type { TaskFormSettingEntity } from '@/models/entities/task-form-setting.entity'
import { BaseRepository } from '@/repositories/base.repository'

export class TaskFormSettingRepository extends BaseRepository<TaskFormSettingEntity> {
  private static readonly SETTING_ID = 'task-form-settings'

  getPartitionKey(organizationId: string): string[] {
    return [organizationId, TaskFormSettingRepository.SETTING_ID]
  }

  getByOrganizationId(organizationId: string): Promise<TaskFormSettingEntity> {
    return this.getById(TaskFormSettingRepository.SETTING_ID, this.getPartitionKey(organizationId))
  }
}
