// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    var checkUsermavenLoaded = function () {
        var _a, _b;
        var usermaven = window.usermaven;
        if (!usermaven) {
            console.log('Usermaven SDK not loaded yet, retrying in 100ms');
            setTimeout(checkUsermavenLoaded, 100);
            return;
        }
        console.log('Usermaven SDK loaded successfully');
        // Test track event
        (_a = document.getElementById('trackEvent')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () {
            usermaven.track('button_click', { buttonId: 'trackEvent' });
            console.log('Track event sent');
        });
        // Test identify user
        (_b = document.getElementById('identifyUser')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function () {
            usermaven.identify({ id: 'user123', email: 'test@example.com' });
            console.log('User identified');
        });
        console.log('Usermaven SDK test script loaded');
    };
    checkUsermavenLoaded();
});
