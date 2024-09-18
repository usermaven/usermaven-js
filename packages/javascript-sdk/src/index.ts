import { UsermavenClient } from './core/client';
import { Config, defaultConfig } from './core/config';
import { RageClick } from './extensions/rage-click';
import { ScrollDepth } from './extensions/scroll-depth';
import { LogLevel } from './utils/logger';
import { UserProps, EventPayload } from './core/types';

function createUsermavenClient(config: Partial<Config>): UsermavenClient {
    const mergedConfig: Config = { ...defaultConfig, ...config } as Config;

    if (!mergedConfig.apiKey) {
        throw new Error('API key is required');
    }

    if (!mergedConfig.trackingHost) {
        throw new Error('Tracking host is required');
    }

    const client = new UsermavenClient(mergedConfig);

    // Initialize extensions
    new RageClick(client);
    new ScrollDepth(client);

    return client;
}

function initFromScript() {
    const script = document.currentScript as HTMLScriptElement;
    if (!script) return;

    const config: Partial<Config> = {
        apiKey: script.getAttribute('data-key') || undefined,
        trackingHost: script.getAttribute('data-tracking-host') || 'https://events.usermaven.com',
        logLevel: (script.getAttribute('data-log-level') as LogLevel) || LogLevel.WARN,
        autocapture: script.getAttribute('data-autocapture') === 'true',
        formTracking: script.getAttribute('data-form-tracking') === 'true',
        autoPageview: script.getAttribute('data-auto-pageview') === 'true',
    };

    const client = createUsermavenClient(config);

    // Expose the client globally
    (window as any).usermaven = client;
}

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
    // If the script is loaded with defer or async, we need to wait for the DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFromScript);
    } else {
        initFromScript();
    }
}

export { createUsermavenClient, Config, UserProps, EventPayload, LogLevel };
