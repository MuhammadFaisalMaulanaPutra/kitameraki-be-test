import type { BaseEntity } from '@/models/entities/base.entity'

export type FieldType = 'text' | 'date' | 'datetime' | 'email'

export type FieldWidth = 'full' | 'half'

export interface FormFieldConfig {
  id: string
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required: boolean
  width: FieldWidth
}

export type FormSettingField = Omit<FormFieldConfig, 'id'>

export interface FormSettingPayload {
  fields: FormSettingField[]
}

export type TaskDynamicData = Record<string, string | number | Date | null>

export interface TaskFormSettingEntity extends BaseEntity {
  fields: FormFieldConfig[]
}
