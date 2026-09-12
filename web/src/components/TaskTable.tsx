import {
  Badge,
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Option,
  TableColumnDefinition,
  createTableColumn,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { DeleteRegular, EditRegular } from '@fluentui/react-icons';
import { FormField, Task, TaskPriority, TaskStatus, taskStatuses } from '../types/task';

interface TaskTableProps {
  tasks: Task[];
  fields: FormField[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const useStyles = makeStyles({
  table: { minWidth: '860px' },
  empty: { padding: tokens.spacingVerticalXXL, textAlign: 'center', color: tokens.colorNeutralForeground3 },
  description: { color: tokens.colorNeutralForeground3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' },
  actions: { display: 'flex', gap: tokens.spacingHorizontalXS },
  field: { minWidth: '130px' }
});

const statusColor: Record<TaskStatus, 'informative' | 'warning' | 'success'> = {
  todo: 'informative',
  'in-progress': 'warning',
  done: 'success'
};

const priorityColor: Record<TaskPriority, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger'
};

function displayValue(task: Task, field: FormField, styles: ReturnType<typeof useStyles>) {
  const value = field.system ? task[field.key as keyof Task] : task.customFields?.[field.key];
  if (!value) return '—';
  if (field.key === 'description') return <span className={styles.description}>{String(value)}</span>;
  if (field.key === 'dueDate' || field.type === 'date' || field.type === 'datetime') return new Date(String(value)).toLocaleString();
  if (field.key === 'status') return <Badge color={statusColor[value as TaskStatus]}>{String(value)}</Badge>;
  if (field.key === 'priority') return <Badge color={priorityColor[value as TaskPriority]}>{String(value)}</Badge>;
  return String(value);
}

export function TaskTable({ tasks, fields, onEdit, onDelete, onStatusChange }: TaskTableProps) {
  const styles = useStyles();
  const visibleFields = fields.filter((field) => field.visible);
  const columns: TableColumnDefinition<Task>[] = [
    createTableColumn<Task>({
      columnId: 'id',
      renderHeaderCell: () => 'ID',
      renderCell: (task) => task.id
    }),
    ...visibleFields.map((field) => createTableColumn<Task>({
    columnId: field.id,
    renderHeaderCell: () => field.label,
    renderCell: (task) => field.key === 'status' ? (
      <Dropdown
        className={styles.field}
        value={task.status}
        selectedOptions={[task.status]}
        onOptionSelect={(_, data) => onStatusChange(task, data.optionValue as TaskStatus)}
        aria-label={`Status for ${task.title}`}
      >
        {taskStatuses.map((status) => <Option key={status} value={status}>{status}</Option>)}
      </Dropdown>
    ) : displayValue(task, field, styles)
    }))
  ];

  columns.push(
    createTableColumn<Task>({
      columnId: 'createdAt',
      renderHeaderCell: () => 'Created',
      renderCell: (task) => new Date(task.createdAt).toLocaleString()
    }),
    createTableColumn<Task>({
      columnId: 'updatedAt',
      renderHeaderCell: () => 'Updated',
      renderCell: (task) => new Date(task.updatedAt).toLocaleString()
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (task) => (
        <div className={styles.actions}>
          <Button icon={<EditRegular />} appearance="subtle" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)} />
          <Button icon={<DeleteRegular />} appearance="subtle" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)} />
        </div>
      )
    })
  );

  if (!tasks.length) return <div className={styles.empty}>No tasks match the current filters.</div>;

  return (
    <DataGrid items={tasks} columns={columns} getRowId={(task) => task.id} className={styles.table}>
      <DataGridHeader><DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow></DataGridHeader>
      <DataGridBody<Task>>{({ item, rowId }) => <DataGridRow<Task> key={rowId}>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>}</DataGridBody>
    </DataGrid>
  );
}
