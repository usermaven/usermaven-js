// This file will be compiled to test.js

// Wait for the SDK to be loaded
window.addEventListener('load', () => {
    if (typeof (window as any).usermaven === 'undefined') {
        console.error('Usermaven SDK not loaded');
        return;
    }

    const usermaven = (window as any).usermaven;

    // Test track event
    document.getElementById('trackEvent')?.addEventListener('click', () => {
        usermaven.track('button_click', { buttonId: 'trackEvent' });
        console.log('Track event sent');
    });

    // Test identify user
    document.getElementById('identifyUser')?.addEventListener('click', () => {
        usermaven.identify({ id: 'user123', email: 'test@example.com' });
        console.log('User identified');
    });

    console.log('Usermaven SDK test script loaded');
});
