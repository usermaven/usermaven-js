require('dotenv').config();

module.exports = {
  test_framework: 'vitest',
  browsers: [
    // Desktop Browsers
    {
      browser: 'chrome',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11'
    },
    {
      browser: 'firefox',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11'
    },
    {
      browser: 'edge',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11'
    },
    {
      browser: 'safari',
      browser_version: 'latest',
      os: 'OS X',
      os_version: 'Sonoma'
    },
    // Mobile Devices
    {
      deviceName: 'iPhone 15',
      platformName: 'iOS',
      platformVersion: '17'
    },
    {
      deviceName: 'Samsung Galaxy S23',
      platformName: 'Android',
      platformVersion: '13.0'
    },
    // Tablets
    {
      deviceName: 'iPad Pro 12.9 2023',
      platformName: 'iOS',
      platformVersion: '17'
    },
    {
      deviceName: 'Samsung Galaxy Tab S9',
      platformName: 'Android',
      platformVersion: '13.0'
    }
  ],
  run_settings: {
    cypress_config_file: './browserstack.cypress.json',
    project_name: process.env.BROWSERSTACK_PROJECT_NAME || 'Usermaven Pixel Tests',
    build_name: process.env.BROWSERSTACK_BUILD_NAME || 'Pixel Integration Tests',
    parallels: 5
  },
  connection_settings: {
    local: true,
    local_identifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER
  }
}
