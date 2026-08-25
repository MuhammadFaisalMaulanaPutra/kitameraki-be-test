export const createLogger = (prefix = '') => {
  const tag = prefix ? `[${prefix}] ` : ''

  return {
    info: (msg) => console.log(`[INFO]  ${tag}${msg}`),
    success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m    ${tag}${msg}`),
    warn: (msg) => console.warn(`\x1b[33m[WARN]\x1b[0m  ${tag}${msg}`),
    error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${tag}${msg}`)
  }
}

export const log = createLogger()
