import { useEffect, useState } from 'react';
import { Button, FluentProvider, makeStyles, tokens, webLightTheme } from '@fluentui/react-components';
import { SettingsRegular, TableRegular } from '@fluentui/react-icons';
import { getFormSettings } from './api/taskApi';
import { FormSettings, defaultFormSettings } from './types/task';
import { FormSettingsPage } from './pages/FormSettingsPage';
import { TaskListPage } from './pages/TaskListPage';

const useStyles = makeStyles({
  shell: { minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground3 },
  nav: { display: 'flex', justifyContent: 'center', gap: tokens.spacingHorizontalS, padding: tokens.spacingVerticalM, backgroundColor: tokens.colorNeutralBackground1, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }
});

export function App() {
  const styles = useStyles();
  const [view, setView] = useState<'tasks' | 'settings'>('tasks');
  const [settings, setSettings] = useState<FormSettings>(defaultFormSettings);

  useEffect(() => {
    getFormSettings().then(setSettings).catch(() => setSettings(defaultFormSettings));
  }, []);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Button appearance={view === 'tasks' ? 'primary' : 'subtle'} icon={<TableRegular />} onClick={() => setView('tasks')}>Task list</Button>
          <Button appearance={view === 'settings' ? 'primary' : 'subtle'} icon={<SettingsRegular />} onClick={() => setView('settings')}>Form settings</Button>
        </nav>
        {view === 'tasks' ? <TaskListPage settings={settings} /> : <FormSettingsPage settings={settings} onSaved={setSettings} />}
      </div>
    </FluentProvider>
  );
}
