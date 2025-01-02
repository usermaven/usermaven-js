import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60000,
  projects: [
    // Desktop Browsers
    {
      name: 'Chrome@latest:Windows 11',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Chrome@latest-1:Windows 10',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Firefox@latest:Windows 11',
      use: {
        browserName: 'firefox',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Safari@latest:macOS Ventura',
      use: {
        browserName: 'webkit',
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Mobile Devices
    {
      name: 'iPhone 14',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Samsung Galaxy S22',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
      },
    },
    // Tablets
    {
      name: 'iPad Pro 12.9',
      use: {
        browserName: 'webkit',
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],
  use: {
    // BrowserStack specific config
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=
        ${encodeURIComponent(JSON.stringify({
          browser: process.env.BROWSER || 'chrome',
          os: process.env.OS || 'Windows',
          os_version: process.env.OS_VERSION || '11',
          name: 'Usermaven Pixel Test',
          build: `Usermaven Pixel ${new Date().toISOString()}`,
          'browserstack.username': process.env.BROWSERSTACK_USERNAME,
          'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
        }))}`,
    },
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  retries: process.env.CI ? 2 : 0,
  workers: 5,
  reporter: [['html'], ['list']],
});
