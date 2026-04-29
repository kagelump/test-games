/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3214',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command: 'make dev',
    url: 'http://localhost:3214',
    reuseExistingServer: true,
    timeout: 120000,
  },
};
