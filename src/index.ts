import { app } from '@azure/functions';
import 'dotenv/config';

// Global Azure Functions Host Setup
app.setup({
  enableHttpStream: true,
});

// Domain Feature Modules
import './modules/tasks';
import './modules/settings';
