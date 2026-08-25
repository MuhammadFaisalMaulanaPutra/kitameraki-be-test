import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CosmosClient } from '@azure/cosmos'
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
        partitionKeyPath: '/organizationId'
      },
      {
        id: get('COSMOS_SETTINGS_CONTAINER', get('COSMOS_FORM_SETTINGS_CONTAINER', 'FormSettings')),
        partitionKeyPath: '/organizationId'
      }
    ]
  }
}

async function initializeCosmos(config) {
  const startTime = performance.now()
  const client = new CosmosClient(config.connectionString)

  log.info(`Verifying database: "${config.databaseName}"`)
  const { database } = await client.databases.createIfNotExists({ id: config.databaseName })
  log.success(`Database ready: "${config.databaseName}"`)

  log.info(`Provisioning ${config.containers.length} container(s) concurrently...`)
  await Promise.all(
    config.containers.map(async ({ id, partitionKeyPath }) => {
      await database.containers.createIfNotExists({
        id,
        partitionKey: { paths: [partitionKeyPath] }
      })
      log.success(`Container ready: "${id}" (Partition: ${partitionKeyPath})`)
    })
  )

  const duration = ((performance.now() - startTime) / 1000).toFixed(2)
  log.info(`Cosmos DB infrastructure ready in ${duration}s.`)
}

async function main() {
  try {
    const config = loadConfig()
    await initializeCosmos(config)
  } catch (error) {
    log.error(`Initialization failed: ${error.message}`)
    process.exitCode = 1
  }
}

await main()
