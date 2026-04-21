import { app } from '@azure/functions';
import './config/container';
import './functions/task';
import './functions/auth';

app.setup({
    enableHttpStream: true,
});