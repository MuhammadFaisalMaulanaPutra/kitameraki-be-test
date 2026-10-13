import { app } from '@azure/functions';
import { ensureContainersExist } from '@/database/cosmosClient';
import { seedDatabase } from '@/database/seed';

app.setup({
    enableHttpStream: true,
});

ensureContainersExist()
    .then(() => seedDatabase(false))
    .catch((err) => {
        console.warn('[Startup] Deferred container initialization: Cosmos DB not reachable yet.', err.message);
    });

