import { defineConfig, devices } from '@playwright/test'

const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000'
const WEB = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_SKIP_WEB
    ? undefined
    : {
        command: 'npm run dev',
        url: WEB,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  metadata: { apiUrl: API },
})
