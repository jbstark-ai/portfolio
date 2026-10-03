import { defineConfig } from '@playwright/test'

// Starts the Go API (in-memory DB) and the Vite dev server.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5174' },
  webServer: [
    { command: 'go run .', cwd: '../server', url: 'http://localhost:8081/api/creators', env: { DB_FILE: ':memory:' }, reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm run dev', url: 'http://localhost:5174', reuseExistingServer: true },
  ],
})
