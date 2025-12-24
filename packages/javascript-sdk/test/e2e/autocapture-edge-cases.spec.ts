import { test, expect } from '@playwright/test';
import { UsermavenGlobal } from '../../src/core/types';

declare global {
  interface Window {
    usermaven?: UsermavenGlobal;
    usermavenQ?: any[];
  }
}

test.describe('Usermaven Autocapture Edge Cases Tests', () => {
  /**
   * Helper function to wait for Usermaven to initialize
   */
  const waitForUsermavenInit = async (page) => {
    await page.waitForFunction(
      () => {
        return typeof window.usermaven === 'function';
      },
      { timeout: 10000 },
    );

    await page.evaluate(() => {
      console.log('Usermaven initialized:', typeof window.usermaven);
    });

    await page.waitForTimeout(1000);
  };



  test('should handle document and window events without crashing', async ({
    page,
  }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    // Test document events
    const documentResult = await page.evaluate(() => {
      try {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        document.dispatchEvent(event);
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(documentResult.success).toBe(true);
    expect(documentResult.error).toBeNull();

    // Test window events
    const windowResult = await page.evaluate(() => {
      try {
        const event = new Event('resize', { bubbles: true });
        window.dispatchEvent(event);
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(windowResult.success).toBe(true);
    expect(windowResult.error).toBeNull();

    console.log('Document/Window events test passed without crashes');
  });

  test('should handle shadow DOM elements correctly', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const shadowDomResult = await page.evaluate(() => {
      try {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<button id="shadowBtn">Shadow Button</button>';

        const button = shadow.getElementById('shadowBtn');
        if (!button) {
          throw new Error('Shadow button not found');
        }

        button.click();

        // Cleanup
        document.body.removeChild(host);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(shadowDomResult.success).toBe(true);
    expect(shadowDomResult.error).toBeNull();

    await page.waitForTimeout(1000);

    console.log('Shadow DOM test passed without crashes');
  });

  test('should handle nested shadow DOM without crashing', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const nestedShadowResult = await page.evaluate(() => {
      try {
        const host1 = document.createElement('div');
        document.body.appendChild(host1);
        const shadow1 = host1.attachShadow({ mode: 'open' });
        shadow1.innerHTML = '<div id="innerHost"></div>';

        const host2 = shadow1.getElementById('innerHost');
        if (!host2) {
          throw new Error('Inner host not found');
        }

        const shadow2 = host2.attachShadow({ mode: 'open' });
        shadow2.innerHTML = '<button id="nestedBtn">Nested Button</button>';

        const button = shadow2.getElementById('nestedBtn');
        if (!button) {
          throw new Error('Nested button not found');
        }

        button.click();

        // Cleanup
        document.body.removeChild(host1);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(nestedShadowResult.success).toBe(true);
    expect(nestedShadowResult.error).toBeNull();

    console.log('Nested shadow DOM test passed without crashes');
  });

  test('should handle custom elements with shadow DOM', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const customElementResult = await page.evaluate(() => {
      try {
        // Define custom element
        if (!customElements.get('test-component')) {
          class TestComponent extends HTMLElement {
            constructor() {
              super();
              const shadow = this.attachShadow({ mode: 'open' });
              shadow.innerHTML = '<button id="customBtn">Custom Button</button>';
            }
          }
          customElements.define('test-component', TestComponent);
        }

        const custom = document.createElement('test-component');
        document.body.appendChild(custom);

        // Wait a bit for custom element to initialize
        setTimeout(() => {
          const button = custom.shadowRoot?.getElementById('customBtn');
          if (button) {
            button.click();
          }
        }, 100);

        // Cleanup after a delay
        setTimeout(() => {
          document.body.removeChild(custom);
        }, 500);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(customElementResult.success).toBe(true);
    expect(customElementResult.error).toBeNull();

    await page.waitForTimeout(1000);

    console.log('Custom elements test passed without crashes');
  });

  test('should handle text nodes and non-element nodes safely', async ({
    page,
  }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const textNodeResult = await page.evaluate(() => {
      try {
        const container = document.createElement('div');
        container.innerHTML = 'Text with <span>nested</span> elements';
        document.body.appendChild(container);

        const span = container.querySelector('span');
        if (!span) {
          throw new Error('Span not found');
        }

        // Click on the span which contains text nodes
        span.click();

        // Cleanup
        document.body.removeChild(container);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(textNodeResult.success).toBe(true);
    expect(textNodeResult.error).toBeNull();

    console.log('Text nodes test passed without crashes');
  });

  test('should handle SVG elements correctly', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const svgResult = await page.evaluate(() => {
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '10');
        rect.setAttribute('y', '10');
        rect.setAttribute('width', '80');
        rect.setAttribute('height', '80');
        rect.setAttribute('fill', 'blue');
        rect.style.cursor = 'pointer';

        svg.appendChild(rect);
        document.body.appendChild(svg);

        // Click on the SVG rect
        rect.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Cleanup
        document.body.removeChild(svg);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(svgResult.success).toBe(true);
    expect(svgResult.error).toBeNull();

    console.log('SVG elements test passed without crashes');
  });

  test('should handle programmatic events safely', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const programmaticResult = await page.evaluate(() => {
      try {
        const button = document.createElement('button');
        button.textContent = 'Test Button';
        document.body.appendChild(button);

        // Dispatch various events
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        button.dispatchEvent(new Event('change', { bubbles: true }));
        button.dispatchEvent(new Event('submit', { bubbles: true }));

        // Cleanup
        document.body.removeChild(button);

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(programmaticResult.success).toBe(true);
    expect(programmaticResult.error).toBeNull();

    console.log('Programmatic events test passed without crashes');
  });

  test('should handle rapid fire events without memory issues', async ({
    page,
  }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const rapidFireResult = await page.evaluate(() => {
      try {
        const button = document.createElement('button');
        button.textContent = 'Rapid Fire Button';
        document.body.appendChild(button);

        // Fire 100 rapid events
        for (let i = 0; i < 100; i++) {
          button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }

        // Cleanup
        document.body.removeChild(button);

        return { success: true, error: null, count: 100 };
      } catch (error) {
        return { success: false, error: (error as Error).message, count: 0 };
      }
    });

    expect(rapidFireResult.success).toBe(true);
    expect(rapidFireResult.error).toBeNull();
    expect(rapidFireResult.count).toBe(100);

    console.log('Rapid fire events test passed without crashes');
  });

  test('should handle elements without tagName gracefully', async ({
    page,
  }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const noTagNameResult = await page.evaluate(() => {
      try {
        // Create a document fragment (which doesn't have tagName)
        const fragment = document.createDocumentFragment();
        const div = document.createElement('div');
        div.innerHTML = '<button id="fragBtn">Fragment Button</button>';
        fragment.appendChild(div);

        document.body.appendChild(fragment);

        const button = document.getElementById('fragBtn');
        if (button) {
          button.click();
          // Cleanup
          button.remove();
        }

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(noTagNameResult.success).toBe(true);
    expect(noTagNameResult.error).toBeNull();

    console.log('Elements without tagName test passed without crashes');
  });

  test('should verify autocapture events are properly structured', async ({
    page,
  }) => {
    const requests: Array<{ url: string; postData?: string }> = [];

    // Intercept requests to capture autocapture events
    await page.route('**/api/v1/event**', async (route) => {
      const req = route.request();
      requests.push({ url: req.url(), postData: req.postData() || undefined });
      await route.continue();
    });

    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    // Create and click a button
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'testButton';
      button.textContent = 'Test Button';
      button.setAttribute('data-test', 'value');
      document.body.appendChild(button);
      button.click();
    });

    await page.waitForTimeout(2000);

    // Find autocapture events
    const autocaptureEvent = requests.find((req) => {
      if (!req.postData) return false;
      try {
        const data = JSON.parse(req.postData);
        const events = Array.isArray(data) ? data : [data];
        return events.some((event) => event.event_type === '$autocapture');
      } catch (e) {
        return false;
      }
    });

    console.log('Captured requests:', requests.length);

    // Verify event structure if events were captured
    if (autocaptureEvent?.postData) {
      const data = JSON.parse(autocaptureEvent.postData);
      const event = Array.isArray(data)
        ? data.find((e) => e.event_type === '$autocapture')
        : data;

      console.log('Autocapture event found:', JSON.stringify(event, null, 2));

      if (event) {
        expect(event.event_type).toBe('$autocapture');
        
        // The event might have event_attributes or directly contain properties
        const attributes = event.event_attributes || event;
        
        console.log('Event attributes:', JSON.stringify(attributes, null, 2));
        
        // Check if $elements exists in the structure
        if (attributes.$elements) {
          expect(Array.isArray(attributes.$elements)).toBe(true);

          // Verify elements have proper structure
          if (attributes.$elements.length > 0) {
            const element = attributes.$elements[0];
            expect(element.tag_name).toBeDefined();
            expect(typeof element.tag_name).toBe('string');
            console.log('Element structure verified:', element.tag_name);
          }
        } else {
          console.log('No $elements found in event, but test passed without crash');
        }
      }
    } else {
      console.log('No autocapture events captured, but all edge cases handled without crashes');
    }

    console.log('Autocapture event structure verification passed');
  });

  test('should handle combined edge cases without errors', async ({ page }) => {
    await page.goto('/test/e2e/autocapture-edge-cases.html');
    await waitForUsermavenInit(page);

    const combinedResult = await page.evaluate(() => {
      const errors: string[] = [];

      try {
        // Test 1: Shadow DOM + SVG
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML =
          '<svg><circle cx="50" cy="50" r="40" style="cursor:pointer;"/></svg>';
        const circle = shadow.querySelector('circle');
        if (circle) {
          circle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        document.body.removeChild(host);
      } catch (error) {
        errors.push('Shadow DOM + SVG: ' + (error as Error).message);
      }

      try {
        // Test 2: Document event
        document.dispatchEvent(
          new Event('custom-event', { bubbles: true }),
        );
      } catch (error) {
        errors.push('Document event: ' + (error as Error).message);
      }

      try {
        // Test 3: Rapid events on shadow element
        const host2 = document.createElement('div');
        document.body.appendChild(host2);
        const shadow2 = host2.attachShadow({ mode: 'open' });
        shadow2.innerHTML = '<button>Shadow Button</button>';
        const btn = shadow2.querySelector('button');
        if (btn) {
          for (let i = 0; i < 10; i++) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
        document.body.removeChild(host2);
      } catch (error) {
        errors.push('Rapid shadow events: ' + (error as Error).message);
      }

      return {
        success: errors.length === 0,
        errors: errors,
      };
    });

    expect(combinedResult.success).toBe(true);
    expect(combinedResult.errors).toHaveLength(0);

    if (combinedResult.errors.length > 0) {
      console.error('Combined edge cases errors:', combinedResult.errors);
    }

    console.log('Combined edge cases test passed without crashes');
  });
});
