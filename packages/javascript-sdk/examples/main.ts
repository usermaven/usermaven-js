import { createUsermavenClient } from '../src/index';

const usermavenClient = createUsermavenClient({
    apiKey: 'test-api-key',
    trackingHost: 'https://example.com',
    logLevel: 'debug',
    autocapture: true,
    formTracking: true,
    autoPageview: true,
});

// Test track event
document.getElementById('trackEvent')?.addEventListener('click', () => {
    usermavenClient.track('button_click', { buttonId: 'trackEvent' });
    console.log('Track event sent');
});

// Test identify user
document.getElementById('identifyUser')?.addEventListener('click', () => {
    usermavenClient.identify({ id: 'user123', email: 'test@example.com' });
    console.log('User identified');
});

console.log('Usermaven SDK test script loaded');
