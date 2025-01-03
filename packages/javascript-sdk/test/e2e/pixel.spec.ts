import { test, expect } from '@playwright/test';

test.describe('Usermaven Pixel Tests', () => {

  test('should load pixel script correctly', async ({ page }) => {
    try {
      // Add initial wait for stability
    await page.waitForTimeout(1000);

      // Navigate to the test page
      const response = await page.goto('/test/e2e/test.html');
      expect(response?.ok()).toBeTruthy();

      // Wait for network idle state
      await page.waitForLoadState('networkidle');

      // Check for script load with correct attributes
      const script = await page.waitForSelector(
        'script#um-tracker[data-key="UMaugVPOWz"]',
        { state: 'attached', timeout: 10000 }
      );
      expect(script).toBeTruthy();

      // Verify page title
      const title = await page.title();
      expect(title).toBe('Usermaven Pixel Test Page');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should fire pageview event', async ({ page }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    // Setup request interception before navigation
    await page.route('**/api/v1/event?token=UMaugVPOWz', async route => {
      const request = route.request();
      requests.push({
        url: request.url(),
        postData: request.postData() as any
      });
      await route.continue();
    });

    try {
      // Navigate to page
      await page.goto('/test/e2e/test.html');
      
      // Wait for the pageview event request
      const response = await page.waitForResponse(
        response => response.url().includes('/api/v1/event') && 
                   response.request().method() === 'POST',
        { timeout: 10000 }
      );
      
      expect(response.status()).toBe(200);
      
      // Verify the request was intercepted
      expect(requests.length).toBeGreaterThan(0);
      
      // Verify the request URL contains the correct token
      const eventRequest = requests[0];
      expect(eventRequest.url).toContain('/api/v1/event?token=UMaugVPOWz');

      // Verify the request payload
      if (eventRequest.postData) {
        const payload = JSON.parse(eventRequest.postData);
        expect(payload).toMatchObject({
          event_type: 'pageview',
          src: 'usermaven',
          api_key: 'UMaugVPOWz',
          page_title: 'Usermaven Pixel Test Page',
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});