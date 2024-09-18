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
        formTracking: script.getAttribute('data-form-tracking') === 'true' ? 'all' : false,
        autoPageview: script.getAttribute('data-auto-pageview') === 'true',
        useBeaconApi: script.getAttribute('data-use-beacon-api') === 'true',
        forceUseFetch: script.getAttribute('data-force-use-fetch') === 'true',
        gaHook: script.getAttribute('data-ga-hook') === 'true',
        segmentHook: script.getAttribute('data-segment-hook') === 'true',
        randomizeUrl: script.getAttribute('data-randomize-url') === 'true',
        capture3rdPartyCookies: script.getAttribute('data-capture-3rd-party-cookies') === 'false' ? false : undefined,
        idMethod: (script.getAttribute('data-id-method') as 'cookie' | 'localStorage') || undefined,
        privacyPolicy: script.getAttribute('data-privacy-policy') === 'strict' ? 'strict' : undefined,
        ipPolicy: (script.getAttribute('data-ip-policy') as Config['ipPolicy']) || undefined,
        cookiePolicy: (script.getAttribute('data-cookie-policy') as Config['cookiePolicy']) || undefined,
        minSendTimeout: parseInt(script.getAttribute('data-min-send-timeout') || '', 10) || undefined,
        maxSendTimeout: parseInt(script.getAttribute('data-max-send-timeout') || '', 10) || undefined,
        maxSendAttempts: parseInt(script.getAttribute('data-max-send-attempts') || '', 10) || undefined,
        propertiesStringMaxLength: parseInt(script.getAttribute('data-properties-string-max-length') || '', 10) || null,
        propertyBlacklist: script.getAttribute('data-property-blacklist')?.split(',') || undefined,
        exclude: script.getAttribute('data-exclude') || undefined,
        namespace: script.getAttribute('data-namespace') || undefined,
        crossDomainLinking: script.getAttribute('data-cross-domain-linking') !== 'false',
        domains: script.getAttribute('data-domains') || undefined,
        compatMode: script.getAttribute('data-compat-mode') === 'true',
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
