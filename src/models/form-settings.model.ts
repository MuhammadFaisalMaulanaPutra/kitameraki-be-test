/**
 * Form settings follow the bpmn.io form-js editor model: a form is a list of rows, each row holds
 * 1 or 2 components (max 2 columns, as required by the test). Containers (group, dynamic list)
 * hold rows of their own.
 */
export const INPUT_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'email',
  'expression',
  'filepicker',
] as const;
export const SELECTION_FIELD_TYPES = ['checkbox', 'checklist', 'radio', 'select', 'taglist'] as const;
export const PRESENTATION_FIELD_TYPES = [
  'textview',
  'image',
  'table',
  'html',
  'documentPreview',
  'spacer',
  'separator',
] as const;
export const CONTAINER_FIELD_TYPES = ['group', 'dynamiclist', 'iframe'] as const;
export const ACTION_FIELD_TYPES = ['button'] as const;
export const FIELD_TYPES = [
  ...INPUT_FIELD_TYPES,
  ...SELECTION_FIELD_TYPES,
  ...PRESENTATION_FIELD_TYPES,
  ...CONTAINER_FIELD_TYPES,
  ...ACTION_FIELD_TYPES,
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** Components the user fills in; they need a key and a label. */
export const DATA_FIELD_TYPES: readonly FieldType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'email',
  'filepicker',
  ...SELECTION_FIELD_TYPES,
];
/** Components whose value is stored on the task under their key (data components + expression). */
export const VALUE_FIELD_TYPES: readonly FieldType[] = [...DATA_FIELD_TYPES, 'expression'];
/** Components that hold rows of other components. */
export const NESTING_FIELD_TYPES: readonly FieldType[] = ['group', 'dynamiclist'];
/** Components with an options source (Static / Input data / Expression). */
export const OPTION_FIELD_TYPES: readonly FieldType[] = ['checklist', 'radio', 'select', 'taglist'];

export const VALIDATION_PATTERNS = ['email', 'phone', 'custom'] as const;
export type ValidationPattern = (typeof VALIDATION_PATTERNS)[number];

export const TIME_INTERVALS = [1, 5, 10, 15, 30, 60] as const;
export type TimeInterval = (typeof TIME_INTERVALS)[number];

export const COMPUTE_ON = ['change', 'presubmit'] as const;
export const BUTTON_ACTIONS = ['submit', 'reset'] as const;
export const VERTICAL_ALIGNMENTS = ['start', 'center', 'end'] as const;

/** iFrame "Security attributes" (sandbox / allow flags), same names as bpmn.io. */
export const IFRAME_SECURITY_FLAGS = [
  'allowScripts',
  'allowSameOrigin',
  'fullscreen',
  'geolocation',
  'camera',
  'microphone',
  'allowForms',
  'allowModals',
  'allowPopups',
  'allowTopNavigation',
  'allowStorageAccessByUserActivation',
] as const;
export type IframeSecurityFlag = (typeof IFRAME_SECURITY_FLAGS)[number];
export type IframeSecurity = Partial<Record<IframeSecurityFlag, boolean>>;

/**
 * Keys bound to the task's own properties. They keep Part 1 features working
 * (search, filters, sorting, inline status change), so their component type is restricted.
 * They must live in the root scope (not inside a group with a path or a dynamic list).
 */
export const CORE_TASK_KEYS = ['title', 'description', 'dueDate', 'priority', 'status', 'tags'] as const;
export type CoreTaskKey = (typeof CORE_TASK_KEYS)[number];

export const CORE_KEY_ALLOWED_TYPES: Readonly<Record<CoreTaskKey, readonly FieldType[]>> = {
  title: ['text', 'textarea'],
  description: ['text', 'textarea'],
  dueDate: ['date', 'datetime'],
  priority: ['select', 'radio'],
  status: ['select', 'radio'],
  tags: ['taglist', 'checklist'],
};

export const MAX_FIELDS_PER_ROW = 2;
/** bpmn.io lays rows out on a 16-column grid; "Columns" lets a component take 2-16 of them. */
export const GRID_COLUMNS = 16;
export const MIN_FIELD_COLUMNS = 2;
/** Containers can be nested up to this depth (group > dynamic list > group). */
export const MAX_NESTING_DEPTH = 3;
export const FORM_SETTINGS_DOCUMENT_ID = 'task-form';
export const FORM_SETTINGS_SCHEMA_VERSION = 3;

/** Default value of a component (Default value entry of the properties panel). */
export type FieldValue = string | number | boolean | string[];

/** Any JSON value; values of expression components and nested containers. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** A file uploaded with POST /files and referenced by a File picker value. */
export interface FileReference {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface TableColumn {
  label: string;
  key: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: ValidationPattern;
  customPattern?: string;
  min?: number;
  max?: number;
}

/**
 * A form component. Properties marked "FEEL" hold an expression starting with "=" that is evaluated in
 * the browser (bpmn.io FEEL, via feelin); the API only checks their shape. Text properties (label,
 * description, text, content, ...) may also start with "=" or contain {{ }} templates.
 */
export interface FormField {
  id: string;
  type: FieldType;
  /** Binds a value component to the task value (`customFields[key]`, or a task property for core keys). */
  key?: string;
  /** Group (optional) / dynamic list (required): child values are nested under this key. */
  path?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: FieldValue;
  required?: boolean;
  disabled?: boolean;
  /** `true`, or a FEEL condition ("=...") that makes the component read only. */
  readOnly?: boolean | string;
  /** Select only: lets users type to filter the options. */
  searchable?: boolean;
  /** Options source "Static". */
  options?: FieldOption[];
  /** Options source "Input data": name of the variable that holds the options. */
  valuesKey?: string;
  /** Options source "Expression" (FEEL). */
  valuesExpression?: string;
  prefix?: string;
  suffix?: string;
  validation?: FieldValidation;
  /** Date / Date & time. */
  disallowPastDates?: boolean;
  /** Time / Date & time. */
  use24h?: boolean;
  timeInterval?: TimeInterval;
  /** Number. */
  decimalDigits?: number;
  increment?: number;
  /** Text view: Markdown with {{ }} templates. */
  text?: string;
  /** HTML view: sanitized HTML with {{ }} templates. */
  content?: string;
  /** Spacer / iFrame height (px). */
  height?: number;
  /** Expression: FEEL target value and when it is computed. */
  expression?: string;
  computeOn?: (typeof COMPUTE_ON)[number];
  /** File picker: accepted formats (e.g. ".pdf,image/*") and multiple files. */
  accept?: string;
  multiple?: boolean;
  /** Image view: URL, data URI or FEEL; alternative text. */
  source?: string;
  alt?: string;
  /** iFrame: https URL or FEEL, and sandbox flags. */
  url?: string;
  security?: IframeSecurity;
  /** Table / Document preview: FEEL expression of the data (rows / documents). */
  dataSource?: string;
  /** Table: rows per page (pagination when set), static header items or a FEEL expression. */
  rowCount?: number;
  columns?: TableColumn[];
  columnsExpression?: string;
  /** Document preview: max height of the preview container (px). */
  maxHeight?: number;
  /** Group / dynamic list appearance. */
  showOutline?: boolean;
  verticalAlignment?: (typeof VERTICAL_ALIGNMENTS)[number];
  /** Dynamic list. */
  defaultRepetitions?: number;
  allowAddRemove?: boolean;
  disableCollapse?: boolean;
  nonCollapsedItems?: number;
  /** Button. */
  action?: (typeof BUTTON_ACTIONS)[number];
  /** Condition: FEEL expression; the component is hidden (and its value dropped) when it evaluates to true. */
  conditional?: { hide?: string };
  /** Layout: number of the 16 grid columns the component takes (auto when unset). */
  layout?: { columns?: number };
  /** Custom properties (free key/value pairs, not interpreted by the app). */
  properties?: Record<string, string>;
  /** Group / dynamic list content. */
  rows?: FormRow[];
}

export interface FormRow {
  id: string;
  fields: FormField[];
}

export interface FormSettings {
  id: string;
  organizationId: string;
  schemaVersion: number;
  /** "Version tag" of the form (bpmn.io form properties). */
  versionTag?: string;
  rows: FormRow[];
  updatedAt: string | null;
}

export const STATUS_OPTIONS: FieldOption[] = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
];

export const PRIORITY_OPTIONS: FieldOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

/** Submit + Reset buttons, like the bpmn.io start form. Removable like any other component. */
export function createActionRow(): FormRow {
  return {
    id: 'row_actions',
    fields: [
      { id: 'field_submit', type: 'button', label: 'Submit', action: 'submit' },
      { id: 'field_reset', type: 'button', label: 'Reset', action: 'reset' },
    ],
  };
}

/**
 * Template used until an organization saves its own form. Every component can be renamed,
 * reconfigured, moved or removed; the template can be loaded again from the editor.
 */
export function createTemplateRows(): FormRow[] {
  return [
    {
      id: 'row_title',
      fields: [
        {
          id: 'field_title',
          type: 'text',
          key: 'title',
          label: 'Title',
          required: true,
          validation: { maxLength: 100 },
        },
      ],
    },
    {
      id: 'row_description',
      fields: [
        {
          id: 'field_description',
          type: 'textarea',
          key: 'description',
          label: 'Description',
          validation: { maxLength: 1000 },
        },
      ],
    },
    {
      id: 'row_schedule',
      fields: [
        { id: 'field_due_date', type: 'datetime', key: 'dueDate', label: 'Due Date' },
        {
          id: 'field_priority',
          type: 'select',
          key: 'priority',
          label: 'Priority',
          options: PRIORITY_OPTIONS.map((option) => ({ ...option })),
        },
      ],
    },
    {
      id: 'row_progress',
      fields: [
        {
          id: 'field_status',
          type: 'select',
          key: 'status',
          label: 'Status',
          required: true,
          defaultValue: 'todo',
          options: STATUS_OPTIONS.map((option) => ({ ...option })),
        },
        { id: 'field_tags', type: 'taglist', key: 'tags', label: 'Tags' },
      ],
    },
    createActionRow(),
  ];
}

export function isValueField(field: FormField): field is FormField & { key: string } {
  return VALUE_FIELD_TYPES.includes(field.type) && typeof field.key === 'string';
}

export function isDataField(field: FormField): field is FormField & { key: string } {
  return DATA_FIELD_TYPES.includes(field.type) && typeof field.key === 'string';
}

export function isCoreKey(key: string): key is CoreTaskKey {
  return (CORE_TASK_KEYS as readonly string[]).includes(key);
}

/** Group with a path or dynamic list: its children write into a nested object / list of objects. */
export function opensScope(field: FormField): boolean {
  return field.type === 'dynamiclist' || (field.type === 'group' && Boolean(field.path));
}

/** Every component of the tree (depth first, display order). */
export function flattenFields(rows: FormRow[]): FormField[] {
  return rows.flatMap((row) => row.fields.flatMap((field) => [field, ...flattenFields(field.rows ?? [])]));
}
