import { loadAppConfig } from '@pim/config'
import { createApiRuntime } from '@pim/application'

loadAppConfig()

export const apiRuntime = createApiRuntime()
