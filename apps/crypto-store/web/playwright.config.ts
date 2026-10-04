import { defineConfig } from '@playwright/test'

// The Vite dev server also serves the API (see server/devApi.ts).
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5175' },
  webServer: { command: 'npm run dev', url: 'http://localhost:5175', reuseExistingServer: true },
})
