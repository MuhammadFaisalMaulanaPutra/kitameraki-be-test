type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

function shouldLog(level: LogLevel): boolean {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info'
  return levelOrder[level] >= (levelOrder[configured] ?? levelOrder.info)
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return
  console.log(
    JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(meta && typeof meta === 'object' ? meta : { meta })
    })
  )
}

export const logger = {
  debug: (message: string, meta?: unknown): void => write('debug', message, meta),
  info: (message: string, meta?: unknown): void => write('info', message, meta),
  warn: (message: string, meta?: unknown): void => write('warn', message, meta),
  error: (message: string, meta?: unknown): void => write('error', message, meta)
}
