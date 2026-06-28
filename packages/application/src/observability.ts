export type RequestContext = Readonly<{
  action?: string
  module?: string
  provider?: string
  requestId: string
  traceId: string
  userId?: string
}>

export type OutboxMetadata = Readonly<
  RequestContext & {
    eventType: string
    outboxEventId: string
  }
>

export type StructuredLogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export type StructuredLogEntry = Readonly<{
  action?: string
  adapterProvider?: string
  details?: Record<string, unknown>
  durationMs?: number
  event: string
  module?: string
  outcome?: string
  provider?: string
  requestId: string
  severity: StructuredLogSeverity
  timestamp: string
  traceId: string
  userId?: string
}>

export type SafeErrorEnvelope = Readonly<{
  error: Readonly<{
    code: string
    details: Record<string, unknown>
    fields: string[]
    message: string
    requestId: string
  }>
}>

export type UnexpectedErrorResult = Readonly<{
  internalCorrelationId: string
  response: SafeErrorEnvelope
}>

export type LogSink = (line: string) => void

type RequestContextInput = {
  action?: string
  module?: string
  provider?: string
  requestId?: string
  traceId?: string
  userId?: string
}

export type StructuredLogger = Readonly<{
  child(context: RequestContextInput): StructuredLogger
  debug(event: string, details?: Record<string, unknown>): StructuredLogEntry
  error(event: string, details?: Record<string, unknown>): StructuredLogEntry
  info(event: string, details?: Record<string, unknown>): StructuredLogEntry
  warn(event: string, details?: Record<string, unknown>): StructuredLogEntry
}>

type LoggerOptions = {
  clock?: () => Date
  context?: RequestContextInput
  sink?: LogSink
}

const sensitiveKeyPattern =
  /(?:accessToken|authToken|authorization|card|cvv|document|email|key|kyc|password|payment|phone|privateKey|refreshToken|secret|signedUrl|token|address)/i

let generatedIdentifierCounter = 0

function defaultSink(line: string): void {
  console.log(line)
}

function normalizeString(value: string): string {
  return value
    .replace(/((?:access[_-]?token|token|secret|signature|key|password)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
}

function isSensitiveKey(key: string): boolean {
  return sensitiveKeyPattern.test(key)
}

function normalizeLogValue(value: unknown, key = ''): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return isSensitiveKey(key) ? '[REDACTED]' : normalizeString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      message: normalizeString(value.message),
      name: value.name,
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => normalizeLogValue(entry, `${key}[${index}]`))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      isSensitiveKey(childKey) ? '[REDACTED]' : normalizeLogValue(childValue, childKey),
    ])

    return Object.fromEntries(entries)
  }

  return String(value)
}

function sanitizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function createIdentifier(prefix: string, value?: string): string {
  const sanitized = sanitizeOptionalString(value)
  if (sanitized) {
    return sanitized
  }

  generatedIdentifierCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${generatedIdentifierCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

function createContextInput(input?: RequestContextInput): RequestContextInput {
  const context: RequestContextInput = {}

  const requestId = sanitizeOptionalString(input?.requestId)
  if (requestId) {
    context.requestId = requestId
  }

  const traceId = sanitizeOptionalString(input?.traceId)
  if (traceId) {
    context.traceId = traceId
  }

  const module = sanitizeOptionalString(input?.module)
  if (module) {
    context.module = module
  }

  const action = sanitizeOptionalString(input?.action)
  if (action) {
    context.action = action
  }

  const provider = sanitizeOptionalString(input?.provider)
  if (provider) {
    context.provider = provider
  }

  const userId = sanitizeOptionalString(input?.userId)
  if (userId) {
    context.userId = userId
  }

  return context
}

function mergeContextInput(base: RequestContext, next?: RequestContextInput): RequestContextInput {
  const context: RequestContextInput = {}

  const requestId = sanitizeOptionalString(next?.requestId ?? base.requestId)
  if (requestId) {
    context.requestId = requestId
  }

  const traceId = sanitizeOptionalString(next?.traceId ?? base.traceId)
  if (traceId) {
    context.traceId = traceId
  }

  const module = sanitizeOptionalString(next?.module ?? base.module)
  if (module) {
    context.module = module
  }

  const action = sanitizeOptionalString(next?.action ?? base.action)
  if (action) {
    context.action = action
  }

  const provider = sanitizeOptionalString(next?.provider ?? base.provider)
  if (provider) {
    context.provider = provider
  }

  const userId = sanitizeOptionalString(next?.userId ?? base.userId)
  if (userId) {
    context.userId = userId
  }

  return context
}

export function createRequestContext(input?: RequestContextInput): RequestContext {
  const context: {
    action?: string
    module?: string
    provider?: string
    requestId: string
    traceId: string
    userId?: string
  } = {
    requestId: createIdentifier('req', input?.requestId),
    traceId: createIdentifier('trace', input?.traceId),
  }

  const partial = createContextInput(input)
  if (partial.action) {
    context.action = partial.action
  }
  if (partial.module) {
    context.module = partial.module
  }
  if (partial.provider) {
    context.provider = partial.provider
  }
  if (partial.userId) {
    context.userId = partial.userId
  }

  return Object.freeze(context)
}

export function createOutboxMetadata(
  context: RequestContext,
  input?: Readonly<{
    eventType?: string
    outboxEventId?: string
  }>,
): OutboxMetadata {
  const eventType = sanitizeOptionalString(input?.eventType) ?? 'system.event'

  return Object.freeze({
    ...context,
    eventType,
    outboxEventId: createIdentifier('outbox', input?.outboxEventId),
  })
}

export function restoreRequestContextFromOutbox(metadata: OutboxMetadata): RequestContext {
  const context: {
    action?: string
    module?: string
    provider?: string
    requestId: string
    traceId: string
    userId?: string
  } = {
    requestId: metadata.requestId,
    traceId: metadata.traceId,
  }

  if (metadata.action) {
    context.action = metadata.action
  }
  if (metadata.module) {
    context.module = metadata.module
  }
  if (metadata.provider) {
    context.provider = metadata.provider
  }
  if (metadata.userId) {
    context.userId = metadata.userId
  }

  return Object.freeze(context)
}

export function createStructuredLogger(options?: LoggerOptions): StructuredLogger {
  const sink = options?.sink ?? defaultSink
  const clock = options?.clock ?? (() => new Date())
  const baseContext = createRequestContext(options?.context)

  function emit(
    severity: StructuredLogSeverity,
    event: string,
    details?: Record<string, unknown>,
    context?: RequestContext,
  ): StructuredLogEntry {
    const activeContext = context ?? baseContext
    const entry: StructuredLogEntry = Object.freeze({
      ...(activeContext.action ? { action: activeContext.action } : {}),
      ...(activeContext.module ? { module: activeContext.module } : {}),
      ...(activeContext.provider ? { provider: activeContext.provider } : {}),
      ...(activeContext.userId ? { userId: activeContext.userId } : {}),
      ...(details ? { details: normalizeLogValue(details) as Record<string, unknown> } : {}),
      event,
      requestId: activeContext.requestId,
      severity,
      timestamp: clock().toISOString(),
      traceId: activeContext.traceId,
    })

    sink(JSON.stringify(entry))
    return entry
  }

  function child(context: Partial<RequestContext>): StructuredLogger {
    return createStructuredLogger({
      clock,
      context: mergeContextInput(baseContext, context),
      sink,
    })
  }

  return Object.freeze({
    child,
    debug(event, details) {
      return emit('DEBUG', event, details)
    },
    error(event, details) {
      return emit('ERROR', event, details)
    },
    info(event, details) {
      return emit('INFO', event, details)
    },
    warn(event, details) {
      return emit('WARN', event, details)
    },
  })
}

export function mapUnexpectedErrorToSafeResponse(
  _error: unknown,
  context: RequestContext,
): UnexpectedErrorResult {
  return {
    internalCorrelationId: context.traceId,
    response: {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        details: {},
        fields: [],
        message: 'เกิดข้อผิดพลาดภายในระบบ',
        requestId: context.requestId,
      },
    },
  }
}

export function runSampleApiRequest(options?: Readonly<{
  context?: RequestContextInput
  clock?: () => Date
  failWith?: unknown
  logger?: StructuredLogger
}>): Readonly<{
  context: RequestContext
  internalCorrelationId?: string
  outboxMetadata: OutboxMetadata
  response:
    | Readonly<{
        data: Readonly<{
          service: 'api'
          status: 'ok'
          timestamp: string
        }>
        meta: Readonly<{
          nextCursor: null
          requestId: string
        }>
      }>
    | SafeErrorEnvelope
}> {
  const clock = options?.clock ?? (() => new Date())
  const contextInput = createContextInput(options?.context)
  contextInput.action = sanitizeOptionalString(options?.context?.action) ?? 'health.check'
  contextInput.module = sanitizeOptionalString(options?.context?.module) ?? 'api'
  const context = createRequestContext(contextInput)
  const loggerOptions: LoggerOptions = {}
  if (options?.clock) {
    loggerOptions.clock = options.clock
  }
  const logger = options?.logger ?? createStructuredLogger(loggerOptions)
  const scopedLogger = logger.child(context)
  const startedAt = clock().getTime()

  scopedLogger.info('api.request.started', {
    path: '/api/v1/health',
    requestId: context.requestId,
    traceId: context.traceId,
  })

  if (options?.failWith !== undefined) {
    const failure = mapUnexpectedErrorToSafeResponse(options.failWith, context)

    scopedLogger.error('api.request.failed', {
      correlationId: failure.internalCorrelationId,
      error: options.failWith,
      requestId: context.requestId,
      traceId: context.traceId,
    })

    return {
      context,
      internalCorrelationId: failure.internalCorrelationId,
      outboxMetadata: createOutboxMetadata(context, {
        eventType: 'health.failed',
      }),
      response: failure.response,
    }
  }

  const response = {
    data: {
      service: 'api' as const,
      status: 'ok' as const,
      timestamp: clock().toISOString(),
    },
    meta: {
      nextCursor: null as null,
      requestId: context.requestId,
    },
  }

  scopedLogger.info('api.request.completed', {
    durationMs: clock().getTime() - startedAt,
    outcome: 'success',
    requestId: context.requestId,
    responseStatus: 200,
    traceId: context.traceId,
  })

  return {
    context,
    outboxMetadata: createOutboxMetadata(context, {
      eventType: 'health.checked',
    }),
    response,
  }
}

export function runSampleWorkerEvent(options: Readonly<{
  context?: RequestContextInput
  failWith?: unknown
  logger?: StructuredLogger
  metadata: OutboxMetadata
}>): Readonly<{
  context: RequestContext
  internalCorrelationId?: string
  response:
    | Readonly<{
        data: Readonly<{
          eventType: string
          outboxEventId: string
          processed: true
          timestamp: string
        }>
        meta: Readonly<{
          nextCursor: null
          requestId: string
        }>
      }>
    | SafeErrorEnvelope
}> {
  const clock = () => new Date()
  const context = restoreRequestContextFromOutbox(options.metadata)
  const loggerOptions: LoggerOptions = {}
  const logger = options.logger ?? createStructuredLogger(loggerOptions)
  const workerContextInput: RequestContextInput = {}
  const workerAction = sanitizeOptionalString(options.context?.action) ?? context.action ?? 'outbox.process'
  const workerModule = sanitizeOptionalString(options.context?.module) ?? context.module ?? 'workers'
  workerContextInput.action = workerAction
  workerContextInput.module = workerModule
  const workerProvider = sanitizeOptionalString(options.context?.provider) ?? context.provider
  if (workerProvider) {
    workerContextInput.provider = workerProvider
  }
  const workerUserId = sanitizeOptionalString(options.context?.userId) ?? context.userId
  if (workerUserId) {
    workerContextInput.userId = workerUserId
  }
  const scopedLogger = logger.child(mergeContextInput(context, workerContextInput))
  const startedAt = clock().getTime()

  scopedLogger.info('worker.event.started', {
    eventType: options.metadata.eventType,
    outboxEventId: options.metadata.outboxEventId,
    requestId: context.requestId,
    traceId: context.traceId,
  })

  if (options.failWith !== undefined) {
    const failure = mapUnexpectedErrorToSafeResponse(options.failWith, context)

    scopedLogger.error('worker.event.failed', {
      correlationId: failure.internalCorrelationId,
      error: options.failWith,
      outboxEventId: options.metadata.outboxEventId,
      requestId: context.requestId,
      traceId: context.traceId,
    })

    return {
      context,
      internalCorrelationId: failure.internalCorrelationId,
      response: failure.response,
    }
  }

  const response = {
    data: {
      eventType: options.metadata.eventType,
      outboxEventId: options.metadata.outboxEventId,
      processed: true as const,
      timestamp: clock().toISOString(),
    },
    meta: {
      nextCursor: null as null,
      requestId: context.requestId,
    },
  }

  scopedLogger.info('worker.event.completed', {
    durationMs: clock().getTime() - startedAt,
    eventType: options.metadata.eventType,
    outcome: 'success',
    outboxEventId: options.metadata.outboxEventId,
    requestId: context.requestId,
    traceId: context.traceId,
  })

  return {
    context,
    response,
  }
}

export function createApiRuntime(options?: Readonly<{
  clock?: () => Date
  logger?: StructuredLogger
  sink?: LogSink
}>): Readonly<{
  handleHealthCheck(options?: Readonly<{
    context?: RequestContextInput
    failWith?: unknown
  }>): ReturnType<typeof runSampleApiRequest>
  logger: StructuredLogger
}> {
  const loggerOptions: LoggerOptions = {}
  if (options?.clock) {
    loggerOptions.clock = options.clock
  }
  if (options?.sink) {
    loggerOptions.sink = options.sink
  }
  const logger = options?.logger ?? createStructuredLogger(loggerOptions)

  return {
    handleHealthCheck(input) {
      const requestOptions: {
        clock?: () => Date
        context?: RequestContextInput
        failWith?: unknown
        logger?: StructuredLogger
      } = {
        failWith: input?.failWith,
        logger,
      }

      if (options?.clock) {
        requestOptions.clock = options.clock
      }
      if (input?.context) {
        requestOptions.context = input.context
      }

      return runSampleApiRequest(requestOptions)
    },
    logger,
  }
}

export function createWorkerRuntime(options?: Readonly<{
  logger?: StructuredLogger
  sink?: LogSink
}>): Readonly<{
  handleOutboxEvent(options: Readonly<{
    failWith?: unknown
    metadata: OutboxMetadata
  }>): ReturnType<typeof runSampleWorkerEvent>
  logger: StructuredLogger
}> {
  const loggerOptions: LoggerOptions = {}
  if (options?.sink) {
    loggerOptions.sink = options.sink
  }
  const logger = options?.logger ?? createStructuredLogger(loggerOptions)

  return {
    handleOutboxEvent(input) {
      return runSampleWorkerEvent({
        failWith: input.failWith,
        logger,
        metadata: input.metadata,
      })
    },
    logger,
  }
}
