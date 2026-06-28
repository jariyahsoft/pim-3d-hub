import { loadAppConfig } from '@pim/config'
import { createWorkerRuntime } from '@pim/application'

loadAppConfig()

export const workerRuntime = createWorkerRuntime()
