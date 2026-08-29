import type { BaseEntity } from '@/models/entities/base.entity'

export type FieldType = 'text' | 'date' | 'datetime' | 'email'

export interface FormFieldConfig {
  id: string
  name: string
  label: string
  type: FieldType
  required: boolean
  order: number
  columnSpan: 1 | 2
  placeholder?: string
}

export type FormSettingField = Omit<FormFieldConfig, 'id'>

export interface FormSettingPayload {
  fields: FormSettingField[]
}

export type TaskDynamicData = Record<string, string | number | Date | null>

export interface TaskFormSettingEntity extends BaseEntity {
  fields: FormFieldConfig[]
}
