import type { TaskFormSettingEntity } from '@/models/entities/task-form-setting.entity'
import type { PutTaskFormSettingSchema } from '@/models/generated/put-task-form-setting'
import type { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'

export class TaskFormSettingService {
  private static readonly SETTING_ID = 'task-form-settings'

  constructor(private readonly settingsRepository: TaskFormSettingRepository) {}

  get(organizationId: string): Promise<TaskFormSettingEntity> {
    return this.settingsRepository.getById(TaskFormSettingService.SETTING_ID, organizationId)
  }

  async put(
    body: PutTaskFormSettingSchema,
    etag: string | null,
    organizationId: string
  ): Promise<TaskFormSettingEntity> {
    const current = await this.get(organizationId).catch(() => undefined)
    if (etag && current?._etag && etag !== current._etag) {
      return this.settingsRepository.replace({
        ...current,
        ...body,
        id: TaskFormSettingService.SETTING_ID,
        organizationId,
        updatedAt: dayjs().toISOString()
      })
    }

    if (etag && current?._etag && etag === current._etag) {
      return this.settingsRepository.replace({
        ...(current ?? {}),
        ...body,
        id: TaskFormSettingService.SETTING_ID,
        organizationId,
        updatedAt: dayjs().toISOString()
      })
    }

    return this.settingsRepository.upsert({
      ...(current ?? {}),
      ...body,
      id: TaskFormSettingService.SETTING_ID,
      organizationId,
      createdAt: current?.createdAt ?? dayjs().toISOString(),
      updatedAt: dayjs().toISOString()
    })
  }
}
import dayjs from 'dayjs'
