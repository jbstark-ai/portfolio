import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5175' },
  webServer: [
    { command: 'dotnet run --project ../api --urls http://localhost:5080', url: 'http://localhost:5080/api/products', env: { DB_FILE: 'data/e2e.db' }, reuseExistingServer: true, timeout: 180_000 },
    { command: 'npm run dev', url: 'http://localhost:5175', reuseExistingServer: true },
  ],
})
