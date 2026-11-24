import { createTemplateRows, type FormField, type FormRow } from '../../src/models/form-settings.model';

/** Template rows plus a row of custom components, as an organization would configure them. */
export function templateWithCustomRows(...custom: FormField[][]): FormRow[] {
  return [...createTemplateRows(), ...custom.map((fields, index) => ({ id: `row_custom_${index}`, fields }))];
}

/** One row per component. */
export function rowsOf(...fields: FormField[]): FormRow[] {
  return fields.map((field, index) => ({ id: `row_${index}`, fields: [field] }));
}

export const reviewerEmailField: FormField = {
  id: 'field_reviewer',
  type: 'email',
  key: 'reviewerEmail',
  label: 'Reviewer',
  required: true,
};

export const startDateField: FormField = { id: 'field_start', type: 'date', key: 'startDate', label: 'Start' };

export const severityField: FormField = {
  id: 'field_severity',
  type: 'radio',
  key: 'severity',
  label: 'Severity',
  options: [
    { label: 'Minor', value: 'minor' },
    { label: 'Major', value: 'major' },
  ],
};

/** Group with a path: values are stored under `customFields.client`. */
export const clientGroup: FormField = {
  id: 'field_client',
  type: 'group',
  path: 'client',
  label: 'Client',
  showOutline: true,
  rows: [
    {
      id: 'row_client',
      fields: [
        { id: 'field_client_name', type: 'text', key: 'name', label: 'Client name', required: true },
        {
          id: 'field_client_tier',
          type: 'select',
          key: 'tier',
          label: 'Tier',
          defaultValue: 'standard',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Gold', value: 'gold' },
          ],
        },
      ],
    },
  ],
};

/** Dynamic list: values are stored as a list of objects under `customFields.checklist`. */
export const checklistList: FormField = {
  id: 'field_checklist',
  type: 'dynamiclist',
  path: 'checklist',
  label: 'Checklist',
  allowAddRemove: true,
  defaultRepetitions: 1,
  rows: [
    {
      id: 'row_checklist_item',
      fields: [
        { id: 'field_item', type: 'text', key: 'item', label: 'Item', required: true },
        { id: 'field_done', type: 'checkbox', key: 'done', label: 'Done' },
      ],
    },
  ],
};

export const attachmentsField: FormField = {
  id: 'field_attachments',
  type: 'filepicker',
  key: 'attachments',
  label: 'Attachments',
  multiple: true,
};

export const summaryExpression: FormField = {
  id: 'field_summary',
  type: 'expression',
  key: 'summary',
  expression: '=title + " (" + string(count(checklist)) + ")"',
};

export const sampleFile = {
  id: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c',
  name: 'brief.pdf',
  size: 1024,
  contentType: 'application/pdf',
};
