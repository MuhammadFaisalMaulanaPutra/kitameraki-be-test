import { app } from '@azure/functions';

// Task functions
import './functions/tasks/GetTasks';
import './functions/tasks/GetTask';
import './functions/tasks/InsertTask';
import './functions/tasks/UpdateTask';
import './functions/tasks/DeleteTask';
import './functions/tasks/BulkDeleteTasks';

// Settings functions
import './functions/settings/GetFormSettings';
import './functions/settings/SaveFormSettings';

app.setup({
  enableHttpStream: true,
});
