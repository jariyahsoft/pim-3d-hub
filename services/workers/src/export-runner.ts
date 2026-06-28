import { runSampleExportWorker, type ExportWorkerResult } from '@pim/application'

export function runExportWorkerSample(): ExportWorkerResult {
  return runSampleExportWorker({
    destinationUri: 'gs://restricted-export-bucket/exports/sample-run',
    encryptionKeyRef: 'projects/example/secrets/export-key/versions/latest',
    entityCounts: [
      {
        count: 0,
        entity: 'users',
      },
      {
        count: 0,
        entity: 'orders',
      },
    ],
    environment: 'local',
    requestedAt: '2026-06-27T00:00:00.000Z',
    runId: 'sample_export_run',
    startedAt: '2026-06-27T00:00:00.000Z',
  })
}
