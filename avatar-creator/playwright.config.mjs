import { defineConfig } from '@playwright/test';

// Tests run against the production build served on the fixed port.
export default defineConfig({
  testDir: 'tests',
  timeout: 120000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:5199', reuseExistingServer: true, timeout: 180000 },
});
