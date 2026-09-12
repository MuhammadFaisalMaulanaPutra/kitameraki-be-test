import { useEffect, useState } from 'react';
import {
  Button,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title1,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { createTask, deleteTask, getTasks, updateTask } from '../api/taskApi';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskFilters } from '../components/TaskFilters';
import { TaskPagination } from '../components/TaskPagination';
import { TaskTable } from '../components/TaskTable';
import { CreateTaskInput, FormSettings, PaginatedTasks, Task, TaskPriority, TaskStatus } from '../types/task';

const pageSize = 10;
const emptyResult: PaginatedTasks = { items: [], page: 1, pageSize, total: 0, totalPages: 0 };

interface TaskListPageProps {
  settings: FormSettings;
}

const useStyles = makeStyles({
  app: { minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground3 },
  main: { maxWidth: '1180px', margin: '0 auto', padding: '48px 32px', '@media (max-width: 720px)': { padding: '28px 16px' } },
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: tokens.spacingHorizontalM, marginBottom: '32px', '@media (max-width: 560px)': { alignItems: 'flex-start', flexDirection: 'column' } },
  panel: { backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, padding: '24px', boxShadow: tokens.shadow2 },
  filters: { marginBottom: '24px' },
  tableWrap: { overflowX: 'auto' },
  loading: { display: 'flex', justifyContent: 'center', padding: '64px' }
});

export function TaskListPage({ settings }: TaskListPageProps) {
  const styles = useStyles();
  const [result, setResult] = useState(emptyResult);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus>();
  const [priority, setPriority] = useState<TaskPriority>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        setError('');
        setResult(await getTasks({ search, status, priority, page, pageSize }));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, priority, page]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeStatus(value?: TaskStatus) {
    setStatus(value);
    setPage(1);
  }

  function changePriority(value?: TaskPriority) {
    setPriority(value);
    setPage(1);
  }

  async function handleCreate(input: CreateTaskInput) {
    try {
      setSaving(true);
      setError('');
      await createTask(input);
      setDialogOpen(false);
      setPage(1);
      setResult(await getTasks({ search, status, priority, page: 1, pageSize }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create task');
      throw requestError;
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    setResult(await getTasks({ search, status, priority, page, pageSize }));
  }

  function openCreate() {
    setEditingTask(undefined);
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  async function handleEdit(input: CreateTaskInput) {
    if (!editingTask) return;
    try {
      setSaving(true);
      setError('');
      await updateTask(editingTask.id, input);
      setDialogOpen(false);
      setEditingTask(undefined);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update task');
      throw requestError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      setError('');
      await deleteTask(task.id);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete task');
    }
  }

  async function handleStatusChange(task: Task, nextStatus: TaskStatus) {
    if (task.status === nextStatus) return;
    try {
      setError('');
      await updateTask(task.id, { status: nextStatus });
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === task.id ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item) }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update task status');
    }
  }

  return (
    <div className={styles.app}>
        <main className={styles.main}>
          <header className={styles.heading}>
            <Title1>Task list</Title1>
            <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>New task</Button>
          </header>
          <section className={styles.panel} aria-label="Task management">
            <div className={styles.filters}>
              <TaskFilters search={search} status={status} priority={priority} onSearchChange={changeSearch} onStatusChange={changeStatus} onPriorityChange={changePriority} />
            </div>
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
            {loading ? <div className={styles.loading}><Spinner label="Loading tasks" /></div> : <div className={styles.tableWrap}><TaskTable tasks={result.items} fields={settings.fields} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} /></div>}
            <TaskPagination page={result.page} totalPages={result.totalPages} total={result.total} onPageChange={setPage} />
          </section>
        </main>
        <CreateTaskDialog open={dialogOpen} loading={saving} fields={settings.fields} task={editingTask} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTask(undefined); }} onSubmit={editingTask ? handleEdit : handleCreate} />
    </div>
  );
}
