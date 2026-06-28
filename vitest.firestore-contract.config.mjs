import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/infrastructure/src/firestore-provider-profile-repository.contract.ts',
      'packages/infrastructure/src/firestore-capacity-repository.contract.ts',
    ],
    testTimeout: 20000,
  },
})
