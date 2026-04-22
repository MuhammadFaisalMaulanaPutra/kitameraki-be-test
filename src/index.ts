import { app } from '@azure/functions';
import * as dotenv from 'dotenv';

dotenv.config();

app.setup({
    enableHttpStream: true,
});
