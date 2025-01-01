import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Usermaven Pixel Integration Tests', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;
  });

  afterEach(() => {
    // Clean up cookies and local storage
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    window.localStorage.clear();
  });

  test('pixel loads and initializes correctly', async () => {
    // Inject the Usermaven pixel
    const script = document.createElement('script');
    script.src = '../dist/lib.js';
    document.head.appendChild(script);

    await new Promise(resolve => script.onload = resolve);

    expect(window.usermaven).toBeDefined();
  });

  test('auto-capture events fire correctly', async () => {
    const events: any[] = [];
    window.usermaven = {
      track: (event: any) => events.push(event)
    };

    // Simulate page view
    const pageViewEvent = events.find(e => e.type === 'pageview');
    expect(pageViewEvent).toBeDefined();
  });

  test('custom events track correctly', async () => {
    const events: any[] = [];
    window.usermaven = {
      track: (event: any) => events.push(event)
    };

    // Track custom event
    window.usermaven.track('test_event', { property: 'value' });

    const customEvent = events.find(e => e.type === 'test_event');
    expect(customEvent).toBeDefined();
    expect(customEvent.properties.property).toBe('value');
  });

  test('cookies are set correctly', async () => {
    window.usermaven = {
      init: () => {}
    };

    window.usermaven.init({
      key: 'test_key',
      tracking_host: 'https://events.usermaven.com'
    });

    // Check for Usermaven cookies
    const cookies = document.cookie;
    expect(cookies).toContain('um_visitor_id');
  });

  test('network requests are made correctly', async () => {
    const mockXHR: any = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn()
    };
    window.XMLHttpRequest = vi.fn(() => mockXHR);

    window.usermaven.track('test_event');

    expect(mockXHR.open).toHaveBeenCalledWith(
      'POST',
      expect.stringContaining('https://events.usermaven.com')
    );
  });

  test('handles form submissions', async () => {
    const events: any[] = [];
    window.usermaven = {
      track: (event: any) => events.push(event)
    };

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="username" value="testuser">
      <button type="submit">Submit</button>
    `;
    document.body.appendChild(form);

    // Simulate form submission
    form.dispatchEvent(new Event('submit'));

    const formEvent = events.find(e => e.type === 'form_submit');
    expect(formEvent).toBeDefined();
  });
});
