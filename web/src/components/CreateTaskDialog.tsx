import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  Textarea,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { CreateTaskInput, FormField, Task, taskPriorities, taskStatuses } from '../types/task';

interface CreateTaskDialogProps {
  open: boolean;
  loading: boolean;
  fields: FormField[];
  task?: Task;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

const useStyles = makeStyles({
  form: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacingVerticalM, '@media (max-width: 600px)': { gridTemplateColumns: '1fr' } },
  columnOne: { gridColumn: '1' },
  columnTwo: { gridColumn: '2', '@media (max-width: 600px)': { gridColumn: '1' } }
});

function taskToForm(task?: Task): CreateTaskInput {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
    priority: task?.priority ?? 'medium',
    dueDate: task?.dueDate,
    customFields: { ...task?.customFields }
  };
}

export function CreateTaskDialog({ open, loading, fields, task, onOpenChange, onSubmit }: CreateTaskDialogProps) {
  const styles = useStyles();
  const [form, setForm] = useState<CreateTaskInput>(taskToForm(task));
  const [validationError, setValidationError] = useState('');
  const isEditing = Boolean(task);
  const visibleFields = fields.filter((field) => field.visible).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (open) {
      setForm(taskToForm(task));
      setValidationError('');
    }
  }, [open, task]);

  function close() {
    setForm(taskToForm());
    setValidationError('');
    onOpenChange(false);
  }

  function setFieldValue(field: FormField, value: string) {
    if (field.system) {
      setForm((current) => ({ ...current, [field.key]: value }));
      return;
    }
    setForm((current) => ({ ...current, customFields: { ...current.customFields, [field.key]: value } }));
  }

  function getFieldValue(field: FormField): string {
    const value = field.system ? form[field.key as keyof CreateTaskInput] : form.customFields?.[field.key];
    if (field.key === 'dueDate' && value) return String(value).slice(0, 16);
    return value == null ? '' : String(value);
  }

  async function submit() {
    if (!form.title.trim()) {
      setValidationError('Title is required.');
      return;
    }
    const missingRequiredField = visibleFields.find((field) => field.required && !getFieldValue(field).trim());
    if (missingRequiredField) {
      setValidationError(`${missingRequiredField.label} is required.`);
      return;
    }
    const dueDate = form.dueDate && !String(form.dueDate).includes('Z')
      ? new Date(String(form.dueDate)).toISOString()
      : form.dueDate;
    await onSubmit({ ...form, title: form.title.trim(), dueDate });
    close();
  }

  function renderField(field: FormField) {
    const value = getFieldValue(field);
    if (field.key === 'description') {
      return <Field label={field.label} required={field.required}><Textarea value={value} onChange={(_, data) => setFieldValue(field, data.value)} resize="vertical" /> </Field>;
    }
    if (field.key === 'status') {
      return <Field label={field.label} required={field.required}><Dropdown value={value} selectedOptions={[value]} onOptionSelect={(_, data) => setFieldValue(field, data.optionValue ?? '')}>{taskStatuses.map((item) => <Option key={item} value={item}>{item}</Option>)}</Dropdown></Field>;
    }
    if (field.key === 'priority') {
      return <Field label={field.label} required={field.required}><Dropdown value={value} selectedOptions={[value]} onOptionSelect={(_, data) => setFieldValue(field, data.optionValue ?? '')}>{taskPriorities.map((item) => <Option key={item} value={item}>{item}</Option>)}</Dropdown></Field>;
    }
    return <Field label={field.label} required={field.required} validationMessage={field.key === 'title' ? validationError : undefined}><Input type={field.type === 'email' ? 'email' : field.key === 'dueDate' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'} value={value} onChange={(_, data) => setFieldValue(field, data.value)} /></Field>;
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && close()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{isEditing ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogContent className={styles.form}>{visibleFields.map((field) => <div className={field.column === 1 ? styles.columnOne : styles.columnTwo} key={field.id}>{renderField(field)}</div>)}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={close}>Cancel</Button>
            <Button appearance="primary" disabled={loading} onClick={submit}>{loading ? 'Saving...' : isEditing ? 'Save changes' : 'Create task'}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
