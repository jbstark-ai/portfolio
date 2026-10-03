import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5176' },
  webServer: [
    { command: 'npm run start', cwd: '../server', url: 'http://localhost:3002/api/accounts', env: { DB_FILE: ':memory:' }, reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run dev', url: 'http://localhost:5176', reuseExistingServer: true },
  ],
})
