import { randomUUID } from 'node:crypto'
import { BadRequestError } from '@/errors/bad-request.error'
import { ConflictError } from '@/errors/conflict.error'
import { NotFoundError } from '@/errors/not-found.error'
import type {
  FormFieldConfig,
  FormSettingField,
  TaskFormSettingEntity
} from '@/models/entities/task-form-setting.entity'
import type { PutTaskFormSettingSchema } from '@/models/generated/put-task-form-setting'
import type { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'
import dayjs from 'dayjs'

export class TaskFormSettingService {
  private static readonly SETTING_ID = 'task-form-settings'

  constructor(private readonly settingsRepository: TaskFormSettingRepository) {}

  async getEntity(organizationId: string): Promise<TaskFormSettingEntity | null> {
    try {
      return await this.settingsRepository.getByOrganizationId(organizationId)
    } catch (error) {
      if (error instanceof NotFoundError) return null
      throw error
    }
  }

  async put(
    body: PutTaskFormSettingSchema,
    etag: string | null,
    organizationId: string
  ): Promise<{ fields: FormFieldConfig[]; etag?: string }> {
    const payloadFields = body.fields as FormSettingField[]
    this.validateFields(payloadFields)

    const current = await this.getEntity(organizationId)

    if (current) {
      if (etag !== null && current._etag && etag !== current._etag) {
        throw new ConflictError('Settings have been modified by another request.')
      }
      if (etag !== null && etag === '') {
        throw new BadRequestError('If-Match header must not be empty.')
      }
    }

    const fieldsWithId = this.assignIds(payloadFields, current)
    const now = dayjs().toISOString()
    const { _etag: _ignored, ...baseWithoutEtag } = (current ?? {}) as TaskFormSettingEntity & {
      _etag?: string
    }

    const entityToPersist: TaskFormSettingEntity = {
      ...baseWithoutEtag,
      id: TaskFormSettingService.SETTING_ID,
      organizationId,
      fields: fieldsWithId,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    } as TaskFormSettingEntity

    const persisted = current
      ? await this.settingsRepository.replace(entityToPersist)
      : await this.settingsRepository.upsert(entityToPersist)

    return {
      fields: persisted.fields ?? [],
      etag: persisted._etag
    }
  }

  private assignIds(
    fields: FormSettingField[],
    current: TaskFormSettingEntity | null
  ): FormFieldConfig[] {
    const existingByName = new Map<string, string>()
    for (const field of current?.fields ?? []) {
      if (field.id) existingByName.set(field.name, field.id)
    }

    return fields.map((field) => ({
      id: existingByName.get(field.name) ?? randomUUID(),
      ...field
    }))
  }

  private validateFields(fields: FormSettingField[]): void {
    const nameSet = new Set<string>()

    for (const field of fields) {
      if (nameSet.has(field.name)) {
        throw new BadRequestError(`Duplicate field name '${field.name}'.`)
      }
      nameSet.add(field.name)
    }
  }
}
