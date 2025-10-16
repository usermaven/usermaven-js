import { test, expect } from '@playwright/test';
import './types';

test.describe('Scroll Depth Tracking Tests', () => {
  
  test('should send events for zero scroll depth', async ({ page }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    // Setup request interception
    await page.route('**/api/v1/event**', async route => {
      const request = route.request();
      const postData = request.postData() || undefined;
      requests.push({ url: request.url(), postData });
      await route.continue();
    });

    try {
      // Navigate to the scroll depth test page
      const pageResponse = await page.goto('/test/e2e/scroll-depth-test.html');
      expect(pageResponse?.ok()).toBeTruthy();

      // Wait for network idle state
      await page.waitForLoadState('networkidle');
      
      // Wait for Usermaven to initialize
      await page.waitForFunction(() => {
        return window.usermaven && window.scrollDepthTest;
      }, { timeout: 10000 });

      // Test 1: Short page (no scroll needed)
      await page.evaluate(() => {
        window.scrollDepthTest?.testShortPage();
      });

      // Wait for events to be processed
      await page.waitForTimeout(2000);

      // Manually send a scroll event to test 0% scroll depth
      await page.evaluate(() => {
        if (window.scrollDepthTest && window.scrollDepthTest.scrollDepthInstance) {
          window.scrollDepthTest.scrollDepthInstance.send('$scroll');
        }
      });
      await page.waitForTimeout(1000);

      // Verify scroll event was sent with 0% scroll depth
      const scrollEvent = requests.find(req => {
        if (!req.postData) return false;
        try {
          const data = JSON.parse(req.postData);
          const events = Array.isArray(data) ? data : [data];
          return events.some(event => 
            event.event_type === '$scroll' &&
            event.event_attributes &&
            event.event_attributes.percent === 0
          );
        } catch (e) {
          return false;
        }
      });

      expect(scrollEvent, 'Scroll event with 0% scroll depth should be sent').toBeTruthy();
      
    } catch (error) {
      console.error('Short page test failed:', error);
      console.log('Captured requests:', JSON.stringify(requests, null, 2));
      throw error;
    }
  });

  test('should track milestone events correctly', async ({ page }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    await page.route('**/api/v1/event**', async route => {
      const request = route.request();
      const postData = request.postData() || undefined;
      requests.push({ url: request.url(), postData });
      await route.continue();
    });

    try {
      await page.goto('/test/e2e/scroll-depth-test.html');
      await page.waitForLoadState('networkidle');
      
      await page.waitForFunction(() => {
        return window.usermaven && window.scrollDepthTest;
      }, { timeout: 10000 });

      // Test 2: Long page with milestone scrolling
      await page.evaluate(() => {
        window.scrollDepthTest?.testLongPage();
      });

      // Simulate scrolling to 25%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(25);
      });
      await page.waitForTimeout(500);

      // Simulate scrolling to 50%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(50);
      });
      await page.waitForTimeout(500);

      // Simulate scrolling to 75%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(75);
      });
      await page.waitForTimeout(500);

      // Simulate scrolling to 90%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(90);
      });
      await page.waitForTimeout(500);
      
      // Ensure 90% milestone is processed by manually triggering scroll tracking
      await page.evaluate(() => {
        // Scroll a bit more to ensure we definitely hit 90%
        window.scrollDepthTest?.simulateScroll(92);
      });
      await page.waitForTimeout(1500); // Longer wait for debounced processing

      // Check for scroll events at milestones
      const scrollEvents = requests.filter(req => {
        if (!req.postData) return false;
        try {
          const data = JSON.parse(req.postData);
          const events = Array.isArray(data) ? data : [data];
          return events.some(event => 
            event.event_type === '$scroll'
          );
        } catch (e) {
          return false;
        }
      });

      expect(scrollEvents.length, 'Should have scroll events at milestones').toBeGreaterThan(0);

      // Verify specific milestones (should send regular $scroll events)
      const milestones = [25, 50, 75, 90];
      milestones.forEach(milestone => {
        const milestoneEvent = requests.find(req => {
          if (!req.postData) return false;
          try {
            const data = JSON.parse(req.postData);
            const events = Array.isArray(data) ? data : [data];
            return events.some(event => 
              event.event_type === '$scroll' &&
              event.event_attributes &&
              event.event_attributes.percent >= milestone
            );
          } catch (e) {
            return false;
          }
        });
        
        expect(milestoneEvent, `Scroll event at ${milestone}% should be captured`).toBeTruthy();
      });

    } catch (error) {
      console.error('Milestone test failed:', error);
      console.log('Captured requests:', JSON.stringify(requests, null, 2));
      throw error;
    }
  });

  test('should track maximum scroll depth correctly', async ({ page }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    await page.route('**/api/v1/event**', async route => {
      const request = route.request();
      const postData = request.postData() || undefined;
      requests.push({ url: request.url(), postData });
      await route.continue();
    });

    try {
      await page.goto('/test/e2e/scroll-depth-test.html');
      await page.waitForLoadState('networkidle');
      
      await page.waitForFunction(() => {
        return window.usermaven && window.scrollDepthTest;
      }, { timeout: 10000 });

      // Test 3: Maximum scroll depth tracking (scroll down then up)
      await page.evaluate(() => {
        window.scrollDepthTest?.testLongPage();
      });

      // Scroll to 80%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(80);
      });
      await page.waitForTimeout(500);

      // Scroll back to 30%
      await page.evaluate(() => {
        window.scrollDepthTest?.simulateScroll(30);
      });
      await page.waitForTimeout(500);

      // Send manual event to check maximum depth reached
      await page.evaluate(() => {
        window.scrollDepthTest?.sendManualEvent();
      });
      await page.waitForTimeout(1000);

      // Find the manual event and verify maximum percent (should be around 80%)
      const manualEvent = requests.find(req => {
        if (!req.postData) return false;
        try {
          const data = JSON.parse(req.postData);
          const events = Array.isArray(data) ? data : [data];
          return events.some(event => 
            event.event_type === '$scroll_manual' &&
            event.event_attributes &&
            event.event_attributes.percent >= 75 && 
            event.event_attributes.percent <= 85
          );
        } catch (e) {
          return false;
        }
      });

      expect(manualEvent, 'Manual event with maximum scroll depth should be captured').toBeTruthy();

    } catch (error) {
      console.error('Max depth test failed:', error);
      console.log('Captured requests:', JSON.stringify(requests, null, 2));
      throw error;
    }
  });

});
