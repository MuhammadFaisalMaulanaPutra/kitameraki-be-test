import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CosmosClient, PartitionKeyDefinitionVersion, PartitionKeyKind } from '@azure/cosmos'
import { faker } from '@faker-js/faker'
import { log } from './logger.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SETTINGS_PATH = resolve(__dirname, '..', 'local.settings.json')

function loadConfig() {
  let fileValues = {}

  if (existsSync(SETTINGS_PATH)) {
    try {
      const raw = readFileSync(SETTINGS_PATH, 'utf8')
      fileValues = JSON.parse(raw)?.Values ?? {}
      log.info(`Loaded configuration from "${SETTINGS_PATH}"`)
    } catch (err) {
      log.warn(
        `Could not parse settings file (${err.message}). Proceeding with environment variables.`
      )
    }
  } else {
    log.warn(
      `Settings file not found at "${SETTINGS_PATH}". Proceeding with environment variables.`
    )
  }

  const get = (key, fallback = undefined) => process.env[key] ?? fileValues[key] ?? fallback

  const connectionString = get('COSMOS_CONNECTION_STRING')
  if (!connectionString) {
    throw new Error('Required configuration "COSMOS_CONNECTION_STRING" is missing.')
  }

  if (get('NODE_TLS_REJECT_UNAUTHORIZED') === '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    log.warn('TLS certificate verification disabled (NODE_TLS_REJECT_UNAUTHORIZED=0).')
  }

  return {
    connectionString,
    databaseName: get('COSMOS_DATABASE_NAME', 'TaskApp'),
    containers: [
      {
        id: get('COSMOS_TASKS_CONTAINER', 'Tasks'),
        paths: ['/organizationId', '/id']
      },
      {
        id: get('COSMOS_SETTINGS_CONTAINER', get('COSMOS_FORM_SETTINGS_CONTAINER', 'FormSettings')),
        paths: ['/organizationId', '/id']
      }
    ]
  }
}

async function ensureContainer(database, { id, paths }) {
  const containerRef = database.container(id)

  try {
    const { resource: existingContainer } = await containerRef.read()

    const existingPaths = existingContainer?.partitionKey?.paths || []
    const isMultiHash = existingContainer?.partitionKey?.kind === PartitionKeyKind.MultiHash
    const isMatchingPaths =
      existingPaths.length === paths.length && existingPaths.every((path, i) => path === paths[i])

    if (isMultiHash && isMatchingPaths) {
      log.success(`Container verified: "${id}" (Partition: ${paths.join(', ')})`)
      return
    }

    log.warn(`Container "${id}" exists with mismatched Partition Key definition. Recreating...`)
    await containerRef.delete()
  } catch (err) {
    if (err.code !== 404) {
      throw err
    }
  }

  await database.containers.create({
    id,
    partitionKey: {
      paths,
      version: PartitionKeyDefinitionVersion.V2,
      kind: PartitionKeyKind.MultiHash
    }
  })

  log.success(`Container created: "${id}" (Partition: ${paths.join(', ')})`)
}

async function seedTasks(database, config) {
  const container = database.container(config.containers[0].id)
  const organizationId = faker.string.uuid()

  log.info(`Seeding tasks for organization "${organizationId}"...`)

  for (let i = 0; i < 145; i++) {
    const taskData = {
      id: faker.string.uuid(),
      organizationId,
      title: faker.book.title(),
      description: faker.lorem.sentence(),
      status: faker.helpers.arrayElement(['todo', 'in_progress', 'done']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
      dueDate: faker.date.future().toISOString(),
      assigneeId: faker.internet.username()
    }

    await container.items.create(taskData)
  }

  log.success('Successfully seeded mock tasks.')
}

async function initializeCosmos(config) {
  const startTime = performance.now()
  const client = new CosmosClient(config.connectionString)

  log.info(`Verifying database: "${config.databaseName}"`)
  const { database } = await client.databases.createIfNotExists({ id: config.databaseName })
  log.success(`Database ready: "${config.databaseName}"`)

  log.info(`Provisioning ${config.containers.length} container(s) concurrently...`)
  await Promise.all(
    config.containers.map((containerDef) => ensureContainer(database, containerDef))
  )

  await seedTasks(database, config)

  const duration = ((performance.now() - startTime) / 1000).toFixed(2)
  log.info(`Cosmos DB infrastructure ready in ${duration}s.`)
}

try {
  const config = loadConfig()
  await initializeCosmos(config)
} catch (error) {
  log.error(`Initialization failed: ${error.message}`)
  process.exitCode = 1
}
