import { SearchRegular } from '@fluentui/react-icons';
import {
  Dropdown,
  Field,
  Input,
  Option,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { TaskPriority, TaskStatus, taskPriorities, taskStatuses } from '../types/task';

interface TaskFiltersProps {
  search: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  onSearchChange: (value: string) => void;
  onStatusChange: (value?: TaskStatus) => void;
  onPriorityChange: (value?: TaskPriority) => void;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1fr) 180px 180px',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    '@media (max-width: 720px)': {
      gridTemplateColumns: '1fr'
    }
  }
});

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done'
};

export function TaskFilters({
  search,
  status,
  priority,
  onSearchChange,
  onStatusChange,
  onPriorityChange
}: TaskFiltersProps) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Field label="Search tasks">
        <Input
          value={search}
          onChange={(_, data) => onSearchChange(data.value)}
          contentBefore={<SearchRegular />}
          placeholder="Search by title or description"
          aria-label="Search tasks"
        />
      </Field>
      <Field label="Status">
        <Dropdown
          value={status ? statusLabel[status] : 'All statuses'}
          selectedOptions={status ? [status] : []}
          onOptionSelect={(_, data) => onStatusChange(data.optionValue as TaskStatus | undefined)}
        >
          <Option value={undefined}>All statuses</Option>
          {taskStatuses.map((item) => <Option key={item} value={item}>{statusLabel[item]}</Option>)}
        </Dropdown>
      </Field>
      <Field label="Priority">
        <Dropdown
          value={priority ? priority[0].toUpperCase() + priority.slice(1) : 'All priorities'}
          selectedOptions={priority ? [priority] : []}
          onOptionSelect={(_, data) => onPriorityChange(data.optionValue as TaskPriority | undefined)}
        >
          <Option value={undefined}>All priorities</Option>
          {taskPriorities.map((item) => <Option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</Option>)}
        </Dropdown>
      </Field>
    </div>
  );
}
