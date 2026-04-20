import { defineConfig } from '@playwright/test';

const PORT = parseInt(process.env.PORT || '3000', 10);

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
