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

  async get(organizationId: string): Promise<FormFieldConfig[]> {
    try {
      const entity = await this.settingsRepository.getByOrganizationId(organizationId)
      const fields = (entity.fields ?? []).map((field) => ({
        ...field,
        id: (field as FormFieldConfig).id ?? field.name
      })) as FormFieldConfig[]
      return this.sortFields(fields)
    } catch (error) {
      if (error instanceof NotFoundError) return []
      throw error
    }
  }

  async getEntity(organizationId: string): Promise<TaskFormSettingEntity | null> {
    try {
      const entity = await this.settingsRepository.getByOrganizationId(organizationId)

      if (entity.fields) {
        entity.fields = (entity.fields as FormFieldConfig[]).map((field) => ({
          ...field,
          id: (field as FormFieldConfig).id ?? field.name
        })) as FormFieldConfig[]
      }
      return entity
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
    const sortedFields = this.sortFields(fieldsWithId)

    const now = dayjs().toISOString()
    const { _etag: _ignored, ...baseWithoutEtag } = (current ?? {}) as TaskFormSettingEntity & {
      _etag?: string
    }

    const entityToPersist: TaskFormSettingEntity = {
      ...baseWithoutEtag,
      id: TaskFormSettingService.SETTING_ID,
      organizationId,
      fields: sortedFields,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    } as TaskFormSettingEntity

    const persisted = current
      ? await this.settingsRepository.replace(entityToPersist)
      : await this.settingsRepository.upsert(entityToPersist)

    return {
      fields: this.sortFields(persisted.fields ?? []),
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

  sortFields(fields: FormFieldConfig[]): FormFieldConfig[] {
    return [...fields].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      if (a.columnSpan !== b.columnSpan) return a.columnSpan - b.columnSpan
      return (a.id ?? a.name ?? '').localeCompare(b.id ?? b.name ?? '')
    })
  }

  private validateFields(fields: FormSettingField[]): void {
    const nameSet = new Set<string>()
    const orderSet = new Set<number>()

    for (const field of fields) {
      if (nameSet.has(field.name)) {
        throw new BadRequestError(`Duplicate field name '${field.name}'.`)
      }
      nameSet.add(field.name)

      if (orderSet.has(field.order)) {
        throw new BadRequestError(`Duplicate field order '${field.order}'.`)
      }
      orderSet.add(field.order)
    }
  }
}
