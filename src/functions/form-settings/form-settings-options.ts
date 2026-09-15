import { app } from '@azure/functions';
import { application } from '@/composition';
import { withHttpHandling } from '@/http';

const handler = withHttpHandling(async () => ({ status: 204 }), application.httpRuntime, {
  requireOrganization: false,
});

app.http('FormSettingsOptions', {
  route: 'form-settings',
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  handler,
});
