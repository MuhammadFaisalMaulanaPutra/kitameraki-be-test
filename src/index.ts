import { app } from '@azure/functions';
import './config/container';
import './functions/task';
import './functions/auth';
import './functions/form-setting';

app.setup({
    enableHttpStream: true,
});