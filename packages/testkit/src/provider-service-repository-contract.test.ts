import { createInMemoryProviderServiceRepository } from './in-memory-provider-service-repository.js'
import {
  createProviderServiceRepositoryHarnessForContract,
  runProviderServiceRepositoryContractSuite,
} from './provider-service-repository-contract.js'

runProviderServiceRepositoryContractSuite({
  createHarness() {
    return createProviderServiceRepositoryHarnessForContract(({ clock, uuidGenerator }) => ({
      repository: createInMemoryProviderServiceRepository({ clock, uuidGenerator }).repository,
    }))
  },
  name: 'ProviderServiceRepository contract: in-memory adapter',
})
