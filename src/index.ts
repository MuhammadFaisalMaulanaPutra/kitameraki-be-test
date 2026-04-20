import { app } from '@azure/functions';
import './config/container';
import './functions/task';

app.setup({
    enableHttpStream: true,
});
