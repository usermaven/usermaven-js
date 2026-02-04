import { test, expect } from '@playwright/test';
import './types';

/**
 * Magento 2 + RequireJS Integration Tests
 * 
 * Customer: Champagne & Gifts (champagneandgifts.co.uk)
 * Issue: "Mismatched anonymous define()" error when loading Usermaven SDK
 * Solution: Safe loader that disables AMD detection without breaking RequireJS
 * 
 * This test validates that:
 * 1. RequireJS continues to work (no "require is undefined" errors)
 * 2. No "Mismatched anonymous define()" errors occur
 * 3. Magento functionality remains intact
 * 4. Usermaven SDK loads and tracks events successfully
 */

test.describe('Magento 2 + RequireJS + Usermaven Integration', () => {
  test('should load Usermaven without breaking RequireJS or Magento', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    try {
      console.log('🧪 Starting Magento 2 + RequireJS integration test...');

      // Navigate to the test page
      const response = await page.goto('/test/e2e/magento-requirejs-test.html');
      expect(response?.ok()).toBeTruthy();

      console.log('✓ Test page loaded');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Wait for Magento modules to load (RequireJS async loading)
      await page.waitForFunction(
        () => {
          return window.magentoTestResults && 
                 window.magentoTestResults.magentoModulesLoaded;
        },
        { timeout: 15000 }
      );

      console.log('✓ Magento modules loaded');

      // Wait for Usermaven to load
      await page.waitForFunction(
        () => {
          return window.magentoTestResults && 
                 window.magentoTestResults.usermavenLoaded;
        },
        { timeout: 15000 }
      );

      console.log('✓ Usermaven loaded');

      // Give tracking a moment to initialize
      await page.waitForTimeout(2000);

      // Get test results
      const testResults = await page.evaluate(() => window.magentoTestResults);

      console.log('📊 Test Results:', JSON.stringify(testResults, null, 2));

      // Ensure testResults exists
      expect(testResults, 'Test results should be available').toBeDefined();
      if (!testResults) throw new Error('Test results not available');

      // CRITICAL TEST 1: RequireJS must be working
      expect(
        testResults.requireJsWorking,
        '❌ CRITICAL: RequireJS is not working - this breaks Magento'
      ).toBe(true);

      // CRITICAL TEST 2: require.config must work
      expect(
        testResults.requireConfigWorking,
        '❌ CRITICAL: require.config() is not working - this breaks Magento configuration'
      ).toBe(true);

      // CRITICAL TEST 3: No "require is undefined" errors
      expect(
        testResults.noRequireErrors,
        '❌ CRITICAL: "require is undefined" errors detected - this breaks Magento'
      ).toBe(true);

      // CRITICAL TEST 4: No "Mismatched anonymous define()" errors
      expect(
        testResults.noDefineErrors,
        '❌ CRITICAL: "Mismatched anonymous define()" errors detected - this is the original customer issue'
      ).toBe(true);

      // TEST 5: Magento modules should load
      expect(
        testResults.magentoModulesLoaded,
        'Magento modules (jQuery, customer-data) should load successfully'
      ).toBe(true);

      // TEST 6: Usermaven should load
      expect(
        testResults.usermavenLoaded,
        'Usermaven SDK should load successfully'
      ).toBe(true);

      // TEST 7: Usermaven tracking should work
      expect(
        testResults.usermavenTracking,
        'Usermaven should be able to track events'
      ).toBe(true);

      // TEST 8: Check for any errors
      expect(
        testResults.errors.length,
        `No errors should occur. Found: ${testResults.errors.join(', ')}`
      ).toBe(0);

      expect(
        testResults.consoleErrors.length,
        `No console errors should occur. Found: ${testResults.consoleErrors.join(', ')}`
      ).toBe(0);

      // Verify no page-level errors
      const criticalErrors = pageErrors.filter(err => 
        err.includes('require is undefined') ||
        err.includes('require is not a function') ||
        err.includes('Mismatched anonymous define')
      );

      expect(
        criticalErrors.length,
        `No critical RequireJS/AMD errors should occur. Found: ${criticalErrors.join(', ')}`
      ).toBe(0);

      console.log('✅ All critical tests passed!');

    } catch (error) {
      console.error('❌ Test failed:', error);
      console.log('Console messages:', consoleMessages);
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors);
      throw error;
    }
  });

  test('should maintain Magento functionality after Usermaven loads', async ({ page }) => {
    try {
      console.log('🧪 Testing Magento functionality preservation...');

      await page.goto('/test/e2e/magento-requirejs-test.html');
      await page.waitForLoadState('networkidle');

      // Wait for everything to load
      await page.waitForFunction(
        () => {
          return window.magentoTestResults && 
                 window.magentoTestResults.usermavenLoaded &&
                 window.magentoTestResults.magentoModulesLoaded;
        },
        { timeout: 15000 }
      );

      console.log('✓ Page fully loaded');

      // Test Magento button functionality
      await page.click('#magento-button');
      
      // Wait for click handler to execute
      await page.waitForTimeout(500);

      // Verify Magento functionality works
      const testResults = await page.evaluate(() => window.magentoTestResults);
      
      expect(testResults, 'Test results should be available').toBeDefined();
      if (!testResults) throw new Error('Test results not available');
      
      expect(
        testResults.magentoFunctionalityWorking,
        'Magento button click handler should work after Usermaven loads'
      ).toBe(true);

      // Verify the output was updated
      const outputText = await page.textContent('#magento-output');
      expect(outputText).toContain('Magento functionality is working!');

      console.log('✅ Magento functionality test passed!');

    } catch (error) {
      console.error('❌ Magento functionality test failed:', error);
      throw error;
    }
  });

  test('should track events through Usermaven in Magento environment', async ({ page }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    // Intercept tracking requests
    await page.route('**/api/v1/event**', async (route) => {
      const request = route.request();
      const postData = request.postData() || undefined;
      requests.push({ url: request.url(), postData });
      await route.continue();
    });

    try {
      console.log('🧪 Testing Usermaven event tracking in Magento environment...');

      await page.goto('/test/e2e/magento-requirejs-test.html');
      await page.waitForLoadState('networkidle');

      // Wait for Usermaven to load
      await page.waitForFunction(
        () => {
          return window.magentoTestResults && 
                 window.magentoTestResults.usermavenLoaded;
        },
        { timeout: 15000 }
      );

      console.log('✓ Usermaven loaded');

      // Wait for automatic tracking event
      await page.waitForTimeout(2000);

      // Click manual test button
      await page.click('#usermaven-test-button');
      
      // Wait for tracking to complete
      await page.waitForTimeout(3000);

      console.log(`📊 Captured ${requests.length} tracking requests`);

      // Verify at least one tracking request was made
      expect(
        requests.length,
        'At least one tracking request should be sent'
      ).toBeGreaterThan(0);

      // Look for our test events
      const testEvents = requests.filter((req) => {
        if (!req.postData) return false;
        try {
          const data = JSON.parse(req.postData);
          const events = Array.isArray(data) ? data : [data];
          return events.some(
            (event) =>
              event.event_type === 'magento_test_event' ||
              event.event_type === 'manual_test_click'
          );
        } catch (e) {
          return false;
        }
      });

      expect(
        testEvents.length,
        'Magento test events should be tracked'
      ).toBeGreaterThan(0);

      console.log('✅ Event tracking test passed!');

    } catch (error) {
      console.error('❌ Event tracking test failed:', error);
      console.log('Captured requests:', JSON.stringify(requests, null, 2));
      throw error;
    }
  });

  test('should handle multiple RequireJS calls after Usermaven loads', async ({ page }) => {
    try {
      console.log('🧪 Testing RequireJS stability after Usermaven loads...');

      await page.goto('/test/e2e/magento-requirejs-test.html');
      await page.waitForLoadState('networkidle');

      // Wait for Usermaven to load
      await page.waitForFunction(
        () => window.magentoTestResults?.usermavenLoaded,
        { timeout: 15000 }
      );

      console.log('✓ Usermaven loaded');

      // Try to load additional RequireJS modules after Usermaven loads
      const requireStillWorking = await page.evaluate(() => {
        return new Promise((resolve) => {
          try {
            // Test that require() still works
            if (typeof require !== 'function') {
              resolve(false);
              return;
            }

            // Test that we can still load modules
            (require as any)(['jquery'], function($: any) {
              if (typeof $ === 'function') {
                resolve(true);
              } else {
                resolve(false);
              }
            });

            // Timeout fallback
            setTimeout(() => resolve(false), 5000);
          } catch (e) {
            resolve(false);
          }
        });
      });

      expect(
        requireStillWorking,
        'RequireJS should still work after Usermaven loads'
      ).toBe(true);

      console.log('✅ RequireJS stability test passed!');

    } catch (error) {
      console.error('❌ RequireJS stability test failed:', error);
      throw error;
    }
  });

  test('should not interfere with Magento CSP or security policies', async ({ page }) => {
    const cspViolations: string[] = [];

    // Listen for CSP violations
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP')) {
        cspViolations.push(text);
      }
    });

    try {
      console.log('🧪 Testing CSP compatibility...');

      await page.goto('/test/e2e/magento-requirejs-test.html');
      await page.waitForLoadState('networkidle');

      await page.waitForFunction(
        () => window.magentoTestResults?.usermavenLoaded,
        { timeout: 15000 }
      );

      // Check for CSP violations
      expect(
        cspViolations.length,
        `No CSP violations should occur. Found: ${cspViolations.join(', ')}`
      ).toBe(0);

      console.log('✅ CSP compatibility test passed!');

    } catch (error) {
      console.error('❌ CSP compatibility test failed:', error);
      throw error;
    }
  });
});

/**
 * Summary Test - Overall Integration Health Check
 */
test.describe('Magento Integration Summary', () => {
  test('CUSTOMER VALIDATION: Complete integration health check', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CUSTOMER VALIDATION TEST');
    console.log('Customer: Champagne & Gifts (Magento 2)');
    console.log('Issue: Mismatched anonymous define() + require is undefined');
    console.log('Solution: Safe AMD detection disable after RequireJS ready');
    console.log('='.repeat(80) + '\n');

    const healthCheck = {
      pageLoaded: false,
      requireJsWorking: false,
      noRequireErrors: false,
      noDefineErrors: false,
      magentoWorking: false,
      usermavenWorking: false,
      trackingWorking: false,
      overallHealth: 'FAIL'
    };

    try {
      await page.goto('/test/e2e/magento-requirejs-test.html');
      healthCheck.pageLoaded = true;
      
      await page.waitForLoadState('networkidle');

      await page.waitForFunction(
        () => {
          return window.magentoTestResults && 
                 window.magentoTestResults.usermavenLoaded &&
                 window.magentoTestResults.magentoModulesLoaded;
        },
        { timeout: 15000 }
      );

      const results = await page.evaluate(() => window.magentoTestResults);

      if (!results) throw new Error('Test results not available');

      healthCheck.requireJsWorking = results.requireJsWorking && results.requireConfigWorking;
      healthCheck.noRequireErrors = results.noRequireErrors;
      healthCheck.noDefineErrors = results.noDefineErrors;
      healthCheck.magentoWorking = results.magentoModulesLoaded;
      healthCheck.usermavenWorking = results.usermavenLoaded;
      healthCheck.trackingWorking = results.usermavenTracking;

      const allPassing = 
        healthCheck.pageLoaded &&
        healthCheck.requireJsWorking &&
        healthCheck.noRequireErrors &&
        healthCheck.noDefineErrors &&
        healthCheck.magentoWorking &&
        healthCheck.usermavenWorking &&
        healthCheck.trackingWorking;

      healthCheck.overallHealth = allPassing ? 'PASS ✅' : 'FAIL ❌';

      console.log('\n' + '='.repeat(80));
      console.log('📊 HEALTH CHECK RESULTS');
      console.log('='.repeat(80));
      console.log(`Page Loaded:              ${healthCheck.pageLoaded ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`RequireJS Working:        ${healthCheck.requireJsWorking ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`No "require" Errors:      ${healthCheck.noRequireErrors ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`No "define" Errors:       ${healthCheck.noDefineErrors ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Magento Working:          ${healthCheck.magentoWorking ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Usermaven Working:        ${healthCheck.usermavenWorking ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Tracking Working:         ${healthCheck.trackingWorking ? '✅ PASS' : '❌ FAIL'}`);
      console.log('='.repeat(80));
      console.log(`OVERALL HEALTH:           ${healthCheck.overallHealth}`);
      console.log('='.repeat(80) + '\n');

      if (allPassing) {
        console.log('✅ SOLUTION VALIDATED - Safe to send to customer!');
        console.log('\nNext Steps:');
        console.log('1. ✅ Send the safe loader snippet to customer');
        console.log('2. ✅ Customer should test on staging first');
        console.log('3. ✅ Use separate Usermaven project for staging');
        console.log('4. ✅ Deploy to production after staging validation\n');
      } else {
        console.log('❌ SOLUTION NEEDS WORK - Do not send to customer yet!\n');
      }

      // Assert all checks pass
      expect(healthCheck.pageLoaded, 'Page should load').toBe(true);
      expect(healthCheck.requireJsWorking, 'RequireJS should work').toBe(true);
      expect(healthCheck.noRequireErrors, 'No require errors').toBe(true);
      expect(healthCheck.noDefineErrors, 'No define errors').toBe(true);
      expect(healthCheck.magentoWorking, 'Magento should work').toBe(true);
      expect(healthCheck.usermavenWorking, 'Usermaven should work').toBe(true);
      expect(healthCheck.trackingWorking, 'Tracking should work').toBe(true);

    } catch (error) {
      console.error('❌ HEALTH CHECK FAILED:', error);
      console.log('\nHealth Check Status:', healthCheck);
      throw error;
    }
  });
});
