import type { BaseEntity } from '@/models/entities/base.entity'
import type { PutTaskFormSettingSchema } from '@/models/generated/put-task-form-setting'

export interface TaskFormSettingEntity extends BaseEntity {
  schemaVersion: number
  fields: PutTaskFormSettingSchema['fields']
}
