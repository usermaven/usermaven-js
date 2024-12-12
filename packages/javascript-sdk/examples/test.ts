// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const checkUsermavenLoaded = () => {
        const usermaven = (window as any).usermaven;

        if (!usermaven) {
            console.log('Usermaven SDK not loaded yet, retrying in 100ms');
            setTimeout(checkUsermavenLoaded, 100);
            return;
        }

        console.log('Usermaven SDK loaded successfully', usermaven);

        // Test track event
        document.getElementById('trackEvent')?.addEventListener('click', () => {
            usermaven('track', 'button_click', { buttonId: 'trackEvent' });
            console.log('Track event sent');
        });

        // Test identify user
        document.getElementById('identifyUser')?.addEventListener('click', () => {
            usermaven('id', { 
                id: 'user123', 
                email: 'test@example.com',
                custom : {},

                company: {
                    id: 'company123',
                    name: 'Test Company',
                    created_at: '2023-01-01'
                }
            
            });
            console.log('User identified');
        });

        console.log('Usermaven SDK test scripts loaded');
    };

    checkUsermavenLoaded();
});
