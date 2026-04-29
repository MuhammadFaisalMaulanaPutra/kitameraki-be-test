import { app } from '@azure/functions';

import './functions/GetTask';
import './functions/GetTasks';
import './functions/InsertTask';
import './functions/UpdateTask';
import './functions/DeleteTask';
import './functions/BulkDeleteTasks';

app.setup({
    enableHttpStream: true,
});