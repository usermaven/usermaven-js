import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    usermaven?: Function;
    usermavenQ?: any[];
    consoleWarnings?: string[];
    initAttempts?: number;
    usermavenClient?: any;
    client?: any;
    earlyInit?: Function;
    debugLogs?: string[];
    testAutocaptureInit?: Function;
    eventListenerCount?: number;
    runTest?: Function;
    initSucceeded?: boolean;
  }
}

test.describe('Usermaven Multiple Initialization Tests', () => {
  test('should prevent duplicate event listeners when initialized multiple times', async ({ page }) => {
    // Navigate to a simple test page that simulates our SDK behavior
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Multiple Init Test</title>
        <script>
          // Capture console warnings
          window.consoleWarnings = [];
          const originalWarn = console.warn;
          console.warn = function(...args) {
            window.consoleWarnings.push(args.join(' '));
            originalWarn.apply(console, args);
          };
          
          // Track event listener counts
          window.eventListenerCount = 0;
          const originalAddEventListener = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'click') {
              window.eventListenerCount++;
            }
            return originalAddEventListener.call(this, type, listener, options);
          };
          
          // Create global flag like in our SDK
          window.__USERMAVEN_AUTOCAPTURE_INITIALIZED__test_key = false;
        </script>
      </head>
      <body>
        <h1>Multiple Initialization Test</h1>
        <button id="test-button">Test Button</button>
        <div id="debug-output"></div>
        
        <script>
          // Mock our SDK functionality
          function usermavenClient(config) {
            const key = config.key || '';
            const flag = '__USERMAVEN_AUTOCAPTURE_INITIALIZED__' + key;
            
            // Check for existing autocapture initialization
            if (config.autocapture && window[flag]) {
              console.warn('Usermaven: Autocapture already initialized in another instance, skipping duplicate initialization.');
              config.disableAutocaptureListenerRegistration = true;
            }
            
            // Set global flag if autocapture is enabled and not disabled
            if (config.autocapture && !config.disableAutocaptureListenerRegistration) {
              window[flag] = true;
            }
            
            return {
              init: function() {
                // Only add event listeners if not disabled
                if (!config.disableAutocaptureListenerRegistration) {
                  document.addEventListener('click', function() {});
                }
              }
            };
          }
          
          // Add to window
          window.usermavenClient = usermavenClient;
          
          // Initialize first instance
          const client1 = usermavenClient({
            key: 'test_key',
            autocapture: true
          });
          client1.init();
          
          // Button to initialize second instance
          document.getElementById('test-button').addEventListener('click', function() {
            // Initialize second instance
            const client2 = usermavenClient({
              key: 'test_key',
              autocapture: true
            });
            client2.init();
            
            // Show debug info
            const debugOutput = document.getElementById('debug-output');
            debugOutput.innerHTML = 'Warnings: ' + JSON.stringify(window.consoleWarnings);
            
            // Update UI to indicate completion
            document.body.setAttribute('data-second-init', 'complete');
          });
        </script>
      </body>
      </html>
    `);
    
    // Wait for the page to initialize
    await page.waitForTimeout(1000);
    
    // Get initial click listener count
    const initialCount = await page.evaluate(() => window.eventListenerCount || 0);
    console.log('Initial listener count:', initialCount);
    
    // Click the button to initialize a second instance
    await page.click('#test-button');
    
    // Wait for second initialization
    await page.waitForSelector('body[data-second-init="complete"]');
    await page.waitForTimeout(1000);
    
    // Get the new listener count
    const newCount = await page.evaluate(() => window.eventListenerCount || 0);
    console.log('New listener count:', newCount);
    
    // Check for warning about duplicate initialization
    const warnings = await page.evaluate(() => window.consoleWarnings || []);
    console.log('Warnings:', warnings);
    
    // We should have a warning about duplicate initialization
    expect(warnings.some(warning => warning.includes('already initialized'))).toBeTruthy();
    
    // The listener count should not have doubled (only one new listener should be added from the button click handler)
    expect(newCount).toBe(initialCount + 1);
  });

  test('should handle DOM ready check and retry initialization', async ({ page }) => {
    // Create a test page that directly tests the retry logic
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DOM Ready Test</title>
        <script>
          // Setup debug log capture
          window.debugLogs = [];
          const originalDebug = console.debug;
          console.debug = function(msg) {
            window.debugLogs.push(msg);
            originalDebug.apply(console, arguments);
          };
        </script>
      </head>
      <body>
        <h1>DOM Ready Test</h1>
        <div id="debug-output"></div>
        
        <script>
          // Create a simple flag to track if initialization succeeded
          window.initSucceeded = false;
          window.initAttempts = 0;
          
          // Mock AutoCapture class with forced retry
          class MockAutoCapture {
            constructor() {
              this.domHandlersAttached = false;
              this.retryCount = 0;
              this.maxRetries = 2; // Force at least 2 retries
            }
            
            init() {
              window.initAttempts++;
              
              if (this.domHandlersAttached) {
                console.debug('Autocapture already initialized.');
                return;
              }
              
              // Force retry for the first couple of attempts
              if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.debug('Document not ready yet, trying again in 500 milliseconds...');
                setTimeout(() => this.init(), 100); // Use shorter timeout for test
                return;
              }
              
              // After retries, succeed
              this.addDomEventHandlers();
              this.domHandlersAttached = true;
              window.initSucceeded = true;
            }
            
            addDomEventHandlers() {
              console.debug('Autocapture initialized successfully.');
            }
          }
          
          // Run the test
          const autocapture = new MockAutoCapture();
          console.debug('Starting test - about to call init()');
          autocapture.init();
          
          // Check status after a delay
          setTimeout(() => {
            const debugOutput = document.getElementById('debug-output');
            debugOutput.innerHTML = 'Debug logs: ' + JSON.stringify(window.debugLogs) + 
                                   '<br>Init attempts: ' + window.initAttempts;
            document.body.setAttribute('data-test-complete', 'true');
          }, 1000);
        </script>
      </body>
      </html>
    `);
    
    // Wait for test to complete
    await page.waitForSelector('body[data-test-complete="true"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Get debug logs
    const debugLogs = await page.evaluate(() => window.debugLogs || []);
    console.log('Debug logs:', debugLogs);
    
    // Get initialization attempts
    const initAttempts = await page.evaluate(() => window.initAttempts || 0);
    console.log('Init attempts:', initAttempts);
    
    // Get initialization success flag
    const initSucceeded = await page.evaluate(() => window.initSucceeded);
    console.log('Init succeeded:', initSucceeded);
    
    // Check for retry message
    const retryLogs = debugLogs.filter(log => 
      typeof log === 'string' && log.includes('Document not ready'));
    console.log('Retry logs:', retryLogs);
    expect(retryLogs.length).toBeGreaterThan(0);
    
    // Check for successful initialization
    const successLogs = debugLogs.filter(log => 
      typeof log === 'string' && log.includes('initialized successfully'));
    console.log('Success logs:', successLogs);
    expect(successLogs.length).toBeGreaterThan(0);
    
    // Verify multiple initialization attempts
    expect(initAttempts).toBeGreaterThan(1);
    
    // Verify initialization eventually succeeded
    expect(initSucceeded).toBeTruthy();
  });



  test('should not register listeners when autocapture is false', async ({ page }) => {
    await page.setContent(`
      <script>
        window.eventListenerCount = 0;
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (type === 'click') window.eventListenerCount++;
          return originalAddEventListener.call(this, type, listener, options);
        };

        function usermavenClient(config) {
          if (config.autocapture) {
            document.addEventListener('click', function () {});
          }
          return {
            init: function () {}
          };
        }

        const client = usermavenClient({ key: 'abc123', autocapture: false });
        client.init();
      </script>
    `);

    const count = await page.evaluate(() => window.eventListenerCount);
    expect(count).toBe(0);
  });

  test('should isolate autocapture flags across different keys', async ({ page }) => {
    await page.setContent(`
      <script>
        window.consoleWarnings = [];
        const originalWarn = console.warn;
        console.warn = function(...args) {
          window.consoleWarnings.push(args.join(' '));
          originalWarn.apply(console, args);
        };

        function usermavenClient(config) {
          const flag = '__USERMAVEN_AUTOCAPTURE_INITIALIZED__' + config.key;
          if (config.autocapture && window[flag]) {
            console.warn('Autocapture already initialized for key:', config.key);
            config.disableAutocaptureListenerRegistration = true;
          }
          if (config.autocapture && !config.disableAutocaptureListenerRegistration) {
            window[flag] = true;
          }
        }

        // First key
        usermavenClient({ key: 'key_1', autocapture: true });
        // Second key (should not trigger warning)
        usermavenClient({ key: 'key_2', autocapture: true });
      </script>
    `);

    const warnings = await page.evaluate(() => window.consoleWarnings);
    expect(warnings?.some(w => w.includes('key_1'))).toBeFalsy(); // Should not warn on first
    expect(warnings?.some(w => w.includes('key_2'))).toBeFalsy(); // Should not interfere
  });

  test('should honor disableAutocaptureListenerRegistration config flag', async ({ page }) => {
    await page.setContent(`
      <script>
        window.eventListenerCount = 0;
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (type === 'click') window.eventListenerCount++;
          return originalAddEventListener.call(this, type, listener, options);
        };

        function usermavenClient(config) {
          if (config.autocapture && !config.disableAutocaptureListenerRegistration) {
            document.addEventListener('click', function () {});
          }
          return {
            init: function () {}
          };
        }

        usermavenClient({
          key: 'test_key_2',
          autocapture: true,
          disableAutocaptureListenerRegistration: true
        }).init();
      </script>
    `);
    const count = await page.evaluate(() => window.eventListenerCount);
    expect(count).toBe(0);
  });
});
