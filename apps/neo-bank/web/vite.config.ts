import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { buildApp } from './server/app'
import { createMemoryRepo } from './server/memoryRepo'
import { createOpenBankingRepo } from './server/openBankingRepo'
import { createNullPlaidClient } from './server/plaid'
import { devApi } from './server/devApi'

export default defineConfig({
  plugins: [react(), devApi(buildApp(createMemoryRepo(), createOpenBankingRepo(), createNullPlaidClient()))],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
  },
})
