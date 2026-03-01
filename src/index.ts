import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});import "./functions/GetTasks";
import "./functions/GetTask";
import "./functions/InsertTask";
import "./functions/UpdateTask";
import "./functions/DeleteTask";
import "./functions/BulkDeleteTasks";

import "./functions/GetFormSettings";
import "./functions/UpdateFormSettings";
