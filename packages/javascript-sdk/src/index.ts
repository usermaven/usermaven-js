import { UsermavenClient } from './core/client';
import { defaultConfig } from './core/config';
import type { Config } from './core/config';
import { LogLevel } from './utils/logger';
import type { UserProps, EventPayload } from './core/types';
import {parseLogLevel} from "./utils/helpers";

function createUsermavenClient(config: Partial<Config>): UsermavenClient {
    const cleanConfig = JSON.parse(JSON.stringify(config));


    const mergedConfig: Config = { ...defaultConfig, ...cleanConfig } as Config;

    if (!mergedConfig.apiKey) {
        throw new Error('API key is required');
    }

    if (!mergedConfig.trackingHost) {
        throw new Error('Tracking host is required');
    }

    return new UsermavenClient(mergedConfig);
}

function initFromScript(script: HTMLScriptElement) {

    const config: Partial<Config> = {
        apiKey: script.getAttribute('data-key') || undefined,
        trackingHost: script.getAttribute('data-tracking-host') || 'https://events.usermaven.com',
        logLevel: parseLogLevel(script.getAttribute('data-log-level')),
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
        maskAllText: script.getAttribute('data-mask-all-text') === 'true',
        maskAllElementAttributes: script.getAttribute('data-mask-all-element-attributes') === 'true',
    };


    const client = createUsermavenClient(config);
    const namespace = config.namespace || 'usermaven';

    initializeNamespacedClient(namespace, client);
}

function initializeNamespacedClient(namespace: string, client: UsermavenClient) {
    let isReady = false;
    const queue: any[][] = [];
    const onLoadCallbacks: (() => void)[] = [];

    function processQueue() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item) {
                (window as any)[namespace].apply(null, item);
            }
        }
    }

    function executeOnLoadCallbacks() {
        onLoadCallbacks.forEach(callback => callback());
        onLoadCallbacks.length = 0;
    }

    (window as any)[namespace] = function(...args: any[]) {
        const method = args[0];

        if (method === 'onLoad') {
            if (typeof args[1] === 'function') {
                if (isReady) {
                    args[1]();
                } else {
                    onLoadCallbacks.push(args[1]);
                }
            }
            return;
        }

        if (!isReady) {
            queue.push(args);
            return;
        }

        if (typeof client[method] === 'function') {
            return client[method].apply(client, args.slice(1));
        } else {
            console.error(`Method ${method} not found on UsermavenClient`);
        }
    };

    // Initialize queue processing
    const queueName = `${namespace}Q`;
    const existingQueue = (window as any)[queueName] || [];
    (window as any)[queueName] = existingQueue;

    existingQueue.push = function(...args: any[]) {
        (window as any)[namespace].apply(null, args);
        return Array.prototype.push.apply(this, args);
    };

    // Set core as ready and process any queued items
    setTimeout(() => {
        isReady = true;
        processQueue();
        executeOnLoadCallbacks();
        console.log(`Usermaven client for namespace ${namespace} is ready`);
    }, 0);

    // Process any existing queue items
    while (existingQueue.length > 0) {
        const item = existingQueue.shift();
        if (item) {
            queue.push(item);
        }
    }
}

// Wrap the initialization in an IIFE
(function (document, window) {
    // Capture the current script
    const currentScript = document.currentScript as HTMLScriptElement;

    function initialize() {
        if (currentScript) {
            initFromScript(currentScript);
        } else {
            console.error('Unable to find Usermaven script tag');
        }
    }

    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
        // If the script is loaded with defer or async, we need to wait for the DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }
})(document, window);

export { createUsermavenClient, Config, UserProps, EventPayload, LogLevel };
