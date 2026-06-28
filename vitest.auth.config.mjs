import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/infrastructure/src/firebase-identity-adapter.emulator.ts'],
    testTimeout: 20000,
  },
})
