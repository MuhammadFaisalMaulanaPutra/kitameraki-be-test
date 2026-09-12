import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Title1,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, SaveRegular } from '@fluentui/react-icons';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { saveFormSettings } from '../api/taskApi';
import { FormField, FormFieldType, FormSettings, formFieldTypes } from '../types/task';

interface FormSettingsPageProps {
  settings: FormSettings;
  onSaved: (settings: FormSettings) => void;
}

const useStyles = makeStyles({
  main: { maxWidth: '1000px', margin: '0 auto', padding: '48px 32px', '@media (max-width: 720px)': { padding: '28px 16px' } },
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: tokens.spacingHorizontalM, marginBottom: '24px', '@media (max-width: 600px)': { alignItems: 'flex-start', flexDirection: 'column' } },
  help: { color: tokens.colorNeutralForeground3, marginBottom: '24px' },
  list: { display: 'grid', gap: tokens.spacingVerticalS },
  card: { display: 'grid', gridTemplateColumns: '24px minmax(150px, 1fr) 150px 120px auto', gap: tokens.spacingHorizontalM, alignItems: 'center', padding: '16px', backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, '@media (max-width: 760px)': { gridTemplateColumns: '24px 1fr', '& > :nth-child(n+3)': { gridColumn: '2' } } },
  drag: { cursor: 'grab', color: tokens.colorNeutralForeground3 },
  options: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center', flexWrap: 'wrap' },
  add: { marginTop: tokens.spacingVerticalM }
});

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: 'Text',
  date: 'Date',
  datetime: 'Date and time',
  email: 'Email'
};

function SortableField({ field, onChange, onRemove }: { field: FormField; onChange: (field: FormField) => void; onRemove: () => void }) {
  const styles = useStyles();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={styles.card}>
      <span className={styles.drag} {...attributes} {...listeners} aria-label={`Reorder ${field.label}`}>⠿</span>
      <Field label="Field name">
        <Input value={field.label} onChange={(_, data) => onChange({ ...field, label: data.value })} />
      </Field>
      <Field label="Type">
        <Dropdown value={fieldTypeLabels[field.type]} selectedOptions={[field.type]} disabled={field.system && field.key !== 'description'} onOptionSelect={(_, data) => onChange({ ...field, type: data.optionValue as FormFieldType })}>
          {formFieldTypes.map((type) => <Option key={type} value={type}>{fieldTypeLabels[type]}</Option>)}
        </Dropdown>
      </Field>
      <Field label="Column">
        <Dropdown value={`Column ${field.column}`} selectedOptions={[String(field.column)]} onOptionSelect={(_, data) => onChange({ ...field, column: Number(data.optionValue) as 1 | 2 })}>
          <Option value="1">Column 1</Option>
          <Option value="2">Column 2</Option>
        </Dropdown>
      </Field>
      <div className={styles.options}>
        <Checkbox label="Visible" checked={field.visible} onChange={(_, data) => onChange({ ...field, visible: Boolean(data.checked) })} />
        <Checkbox label="Required" checked={field.required} disabled={field.system && field.key === 'title'} onChange={(_, data) => onChange({ ...field, required: Boolean(data.checked) })} />
        {!field.system && <Button icon={<DeleteRegular />} appearance="subtle" aria-label={`Remove ${field.label}`} onClick={onRemove} />}
      </div>
    </div>
  );
}

export function FormSettingsPage({ settings, onSaved }: FormSettingsPageProps) {
  const styles = useStyles();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [fields, setFields] = useState<FormField[]>(settings.fields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => setFields(settings.fields), [settings]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((current) => {
      const oldIndex = current.findIndex((field) => field.id === active.id);
      const newIndex = current.findIndex((field) => field.id === over.id);
      return arrayMove(current, oldIndex, newIndex).map((field, order) => ({ ...field, order }));
    });
  }

  function addField() {
    const number = fields.filter((field) => !field.system).length + 1;
    setFields((current) => [...current, {
      id: `custom-${Date.now()}`,
      key: `customField${number}`,
      label: `Custom field ${number}`,
      type: 'text',
      visible: true,
      required: false,
      column: 1,
      order: current.length,
      system: false
    }]);
  }

  async function save() {
    try {
      setLoading(true);
      setError('');
      const result = await saveFormSettings({ fields: fields.map((field, order) => ({ ...field, order })) });
      onSaved(result);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save form settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <Title1>Form settings</Title1>
        <Button appearance="primary" icon={<SaveRegular />} disabled={loading} onClick={save}>{loading ? 'Saving...' : 'Save settings'}</Button>
      </div>
      <p className={styles.help}>Rename fields, choose their type, move them into two columns, or add custom fields. Changes apply to every task.</p>
      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {saved && !error && <MessageBar intent="success"><MessageBarBody>Form settings saved.</MessageBarBody></MessageBar>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>{fields.map((field) => <SortableField key={field.id} field={field} onChange={(next) => setFields((current) => current.map((item) => item.id === next.id ? next : item))} onRemove={() => setFields((current) => current.filter((item) => item.id !== field.id))} />)}</div>
        </SortableContext>
      </DndContext>
      <Button className={styles.add} icon={<AddRegular />} appearance="secondary" onClick={addField}>Add field</Button>
    </main>
  );
}

