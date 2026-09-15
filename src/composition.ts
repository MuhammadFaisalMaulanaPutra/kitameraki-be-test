import { createOrganizationAuthorizer } from './authorization';
import { getConfig } from './config';
import { createCosmosClient, getCosmosContainers } from './db/cosmos';
import { CosmosFormSettingsRepository, CosmosTaskRepository } from './repositories';
import { FormSettingsService, TaskService } from './services';

const config = getConfig();
const cosmosClient = createCosmosClient(config);
const containers = getCosmosContainers(cosmosClient, config);
const formSettingsRepository = new CosmosFormSettingsRepository(containers.formSettings);
const settingsService = new FormSettingsService(formSettingsRepository);

export const application = {
  config,
  settingsService,
  taskService: new TaskService(new CosmosTaskRepository(containers.tasks), settingsService),
  httpRuntime: {
    allowedOrigin: config.ALLOWED_ORIGIN,
    authorizer: createOrganizationAuthorizer(config.ORGANIZATION_ID),
    slowCosmosOperationMs: config.SLOW_COSMOS_OPERATION_MS,
  },
};
