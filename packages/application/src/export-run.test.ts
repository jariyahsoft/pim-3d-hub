import { describe, expect, it } from 'vitest'
import { createExportRunSkeleton } from './export-run.js'

describe('export run skeleton', () => {
  it('creates deterministic manifest metadata for a completed run', () => {
    const result = createExportRunSkeleton({
      destinationUri: 'gs://restricted-export-bucket/exports/2026-06-27',
      encryptionKeyRef: 'projects/example/secrets/export-key/versions/latest',
      entityCounts: [
        {
          count: 2,
          entity: 'orders',
        },
        {
          count: 1,
          entity: 'users',
        },
      ],
      environment: 'staging',
      requestedAt: '2026-06-27T00:00:00.000Z',
      runId: 'export_run_123',
      startedAt: '2026-06-27T00:01:00.000Z',
    })

    expect(result.run).toMatchObject({
      completedAt: '2026-06-27T00:01:00.000Z',
      destinationUri: 'gs://restricted-export-bucket/exports/2026-06-27',
      environment: 'staging',
      id: 'export_run_123',
      manifestFile: 'export-runs/export_run_123/manifest.json',
      status: 'COMPLETED',
    })
    expect(result.manifest).toMatchObject({
      assetsManifestFile: 'export-runs/export_run_123/assets/manifest.jsonl',
      checksumFile: 'export-runs/export_run_123/integrity/checksums.json',
      restrictedDestination: {
        access: 'restricted',
        encryptionKeyRef: 'projects/example/secrets/export-key/versions/latest',
        uri: 'gs://restricted-export-bucket/exports/2026-06-27',
      },
      sourceEnvironment: 'staging',
      tables: [
        {
          count: 2,
          entity: 'orders',
          file: 'entities/orders.jsonl',
        },
        {
          count: 1,
          entity: 'users',
          file: 'entities/users.jsonl',
        },
      ],
    })
  })

  it('records failure metadata without pretending the run completed successfully', () => {
    const result = createExportRunSkeleton({
      destinationUri: 'gs://restricted-export-bucket/exports/2026-06-27',
      encryptionKeyRef: 'projects/example/secrets/export-key/versions/latest',
      environment: 'staging',
      failure: {
        code: 'EXPORT_DESTINATION_UNAVAILABLE',
        message: 'restricted destination rejected write access',
      },
      requestedAt: '2026-06-27T00:00:00.000Z',
      runId: 'export_run_failed',
      startedAt: '2026-06-27T00:01:00.000Z',
    })

    expect(result.run.status).toBe('FAILED')
    expect(result.run.completedAt).toBeUndefined()
    expect(result.run.failure?.code).toBe('EXPORT_DESTINATION_UNAVAILABLE')
    expect(result.manifest.completedAt).toBe('2026-06-27T00:01:00.000Z')
  })
})
