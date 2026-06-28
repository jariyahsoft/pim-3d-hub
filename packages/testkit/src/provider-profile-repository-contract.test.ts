import { createInMemoryProviderProfileRepository } from './in-memory-provider-profile-repository.js'
import {
  createProviderProfileRepositoryHarnessForContract,
  runProviderProfileRepositoryContractSuite,
} from './provider-profile-repository-contract.js'

runProviderProfileRepositoryContractSuite({
  createHarness() {
    return createProviderProfileRepositoryHarnessForContract(({ clock, uuidGenerator }) =>
      createInMemoryProviderProfileRepository({ clock, uuidGenerator }),
    )
  },
  name: 'ProviderProfileRepository contract: in-memory adapter',
})
