import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { CosmosClient } from '@azure/cosmos';
import { Task } from '../models/task.model.js';

const settingsPath = path.resolve('local.settings.json');
if (fs.existsSync(settingsPath)) {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.Values) {
      Object.assign(process.env, settings.Values);
    }
  } catch (err) {
    console.warn('Gagal membaca local.settings.json:', err);
  }
}

export const SEED_ORGANIZATION_ID = 'd3b07384-d113-46c1-a9c1-236b28900a01';

const sampleTasks = [
  { title: 'Setup Azure Cosmos DB Database', priority: 'high', status: 'completed', tags: ['devops', 'azure'] },
  { title: 'Refactor Architecture to Repository Pattern', priority: 'high', status: 'completed', tags: ['backend', 'clean-code'] },
  { title: 'Fix SQL Injection in GetTasks query', priority: 'high', status: 'completed', tags: ['security'] },
  { title: 'Setup Zod Runtime Validation', priority: 'medium', status: 'completed', tags: ['validation'] },
  { title: 'Create HealthCheck Endpoint', priority: 'low', status: 'completed', tags: ['devops'] },
  { title: 'Implement Frontend Table with Fluent UI v9', priority: 'high', status: 'in-progress', tags: ['frontend', 'fluent-ui'] },
  { title: 'Add Search and Filter Bar in UI', priority: 'medium', status: 'in-progress', tags: ['frontend'] },
  { title: 'Implement Pagination Controls in Task Table', priority: 'high', status: 'in-progress', tags: ['frontend'] },
  { title: 'Create Task Dialog Modal with Fluent UI', priority: 'medium', status: 'todo', tags: ['frontend', 'ui'] },
  { title: 'Implement Quick Status Dropdown in Table', priority: 'medium', status: 'todo', tags: ['frontend'] },
  { title: 'Setup Delete Confirmation Dialog', priority: 'low', status: 'todo', tags: ['frontend'] },
  { title: 'Build Form Setting Page for Part 2', priority: 'high', status: 'todo', tags: ['part-2', 'drag-and-drop'] },
  { title: 'Implement 2-Column Grid Layout in Form Setting', priority: 'high', status: 'todo', tags: ['part-2'] },
  { title: 'Add Custom Field Types: Text, Date, Email', priority: 'medium', status: 'todo', tags: ['part-2'] },
  { title: 'Connect Frontend Form Settings to Backend API', priority: 'high', status: 'todo', tags: ['integration'] },
  { title: 'Write Comprehensive Unit Tests with Vitest', priority: 'medium', status: 'todo', tags: ['testing'] },
  { title: 'Update README with Local Setup Instructions', priority: 'low', status: 'todo', tags: ['docs'] },
  { title: 'Verify Cross-Browser Compatibility', priority: 'low', status: 'todo', tags: ['qa'] },
  { title: 'Prepare Pull Request to main branch', priority: 'high', status: 'todo', tags: ['git'] },
  { title: 'Final Code Review and Polish', priority: 'medium', status: 'todo', tags: ['review'] },
];

async function runSeed() {
  console.log('Memulai proses seeding data ke Azure Cosmos DB...');
  console.log(`Organization ID: ${SEED_ORGANIZATION_ID}\n`);

  try {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    const databaseName = process.env.COSMOS_DATABASE_NAME || 'TaskApp';
    const containerName = process.env.COSMOS_CONTAINER_NAME || 'Tasks';

    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING belum diisi di local.settings.json!');
    }

    const client = new CosmosClient(connectionString);

    console.log(`Memastikan Database "${databaseName}" tersedia...`);
    const { database } = await client.databases.createIfNotExists({ id: databaseName });

    console.log(`Memastikan Container "${containerName}" tersedia...`);
    const { container } = await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: { paths: ['/organizationId'] },
    });

    const now = new Date();
    let createdCount = 0;

    for (let i = 0; i < sampleTasks.length; i++) {
      const sample = sampleTasks[i];
      const dueDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString();

      const task: Task = {
        id: randomUUID(),
        organizationId: SEED_ORGANIZATION_ID,
        title: sample.title,
        description: `Deskripsi otomatis untuk task "${sample.title}". Dibuat untuk pengujian search, filter, dan pagination.`,
        dueDate: dueDate,
        priority: sample.priority as any,
        status: sample.status as any,
        tags: sample.tags,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await container.items.create(task);
      createdCount++;
      process.stdout.write(`[${createdCount}/${sampleTasks.length}] Sukses membuat: ${task.title}\n`);
    }

    console.log(`\nSEEDING SELESAI! Berhasil memasukkan ${createdCount} data tasks.`);
    console.log(`Gunakan organizationId berikut di frontend:`);
    console.log(`   ${SEED_ORGANIZATION_ID}`);
  } catch (error: any) {
    console.error('\nGagal melakukan seeding:', error.message);
  }
}

runSeed();