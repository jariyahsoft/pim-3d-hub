import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/firebase/rules.emulator.ts'],
  },
})
