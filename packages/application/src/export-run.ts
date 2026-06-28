export type ExportEnvironment = 'local' | 'development' | 'staging' | 'production'

export type ExportRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type ExportFailure = Readonly<{
  code: string
  message: string
}>

export type ExportEntityManifest = Readonly<{
  count: number
  entity: string
  file: string
}>

export type ExportManifest = Readonly<{
  assetsManifestFile: string
  checksumFile: string
  completedAt: string
  exportVersion: 'v1'
  generatedAt: string
  integrityCountsFile: string
  integrityReferencesFile: string
  manifestFile: string
  restrictedDestination: Readonly<{
    access: 'restricted'
    encryptionKeyRef: string
    uri: string
  }>
  sourceEnvironment: ExportEnvironment
  startedAt: string
  tables: readonly ExportEntityManifest[]
}>

export type ExportRunRecord = Readonly<{
  completedAt?: string
  destinationUri: string
  encryptionKeyRef: string
  environment: ExportEnvironment
  failure?: ExportFailure
  id: string
  manifestFile: string
  requestedAt: string
  startedAt: string
  status: ExportRunStatus
}>

export type ExportWorkerResult = Readonly<{
  manifest: ExportManifest
  run: ExportRunRecord
}>

type ExportEntityCountInput = Readonly<{
  count: number
  entity: string
}>

type ExportSkeletonInput = Readonly<{
  completedAt?: string
  destinationUri: string
  encryptionKeyRef: string
  entityCounts?: readonly ExportEntityCountInput[]
  environment: ExportEnvironment
  failure?: ExportFailure
  requestedAt: string
  runId: string
  startedAt: string
}>

function normalizePathSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function createEntityManifest(entityCounts: readonly ExportEntityCountInput[]): readonly ExportEntityManifest[] {
  return entityCounts.map((entry) =>
    Object.freeze({
      count: entry.count,
      entity: entry.entity,
      file: `entities/${entry.entity}.jsonl`,
    }),
  )
}

export function createExportRunSkeleton(input: ExportSkeletonInput): ExportWorkerResult {
  const entityCounts = createEntityManifest(input.entityCounts ?? [])
  const basePath = normalizePathSegment(`export-runs/${input.runId}`)
  const completedAt = input.failure ? undefined : input.completedAt ?? input.startedAt
  const status: ExportRunStatus = input.failure ? 'FAILED' : 'COMPLETED'

  const run: ExportRunRecord = Object.freeze({
    ...(completedAt ? { completedAt } : {}),
    ...(input.failure ? { failure: input.failure } : {}),
    destinationUri: input.destinationUri,
    encryptionKeyRef: input.encryptionKeyRef,
    environment: input.environment,
    id: input.runId,
    manifestFile: `${basePath}/manifest.json`,
    requestedAt: input.requestedAt,
    startedAt: input.startedAt,
    status,
  })

  const manifest: ExportManifest = Object.freeze({
    assetsManifestFile: `${basePath}/assets/manifest.jsonl`,
    checksumFile: `${basePath}/integrity/checksums.json`,
    completedAt: completedAt ?? input.startedAt,
    exportVersion: 'v1',
    generatedAt: input.startedAt,
    integrityCountsFile: `${basePath}/integrity/counts.json`,
    integrityReferencesFile: `${basePath}/integrity/references.json`,
    manifestFile: `${basePath}/manifest.json`,
    restrictedDestination: Object.freeze({
      access: 'restricted' as const,
      encryptionKeyRef: input.encryptionKeyRef,
      uri: input.destinationUri,
    }),
    sourceEnvironment: input.environment,
    startedAt: input.startedAt,
    tables: entityCounts,
  })

  return Object.freeze({
    manifest,
    run,
  })
}

export function runSampleExportWorker(input: Readonly<{
  destinationUri: string
  encryptionKeyRef: string
  entityCounts?: readonly ExportEntityCountInput[]
  environment: ExportEnvironment
  failure?: ExportFailure
  requestedAt: string
  runId: string
  startedAt: string
}>): ExportWorkerResult {
  return createExportRunSkeleton(input)
}
