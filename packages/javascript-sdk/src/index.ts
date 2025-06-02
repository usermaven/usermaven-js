import { UsermavenClient } from './core/client';
import { defaultConfig } from './core/config';
import type { Config } from './core/types';
import { LogLevel } from './utils/logger';
import type { UserProps, EventPayload, ClientProperties } from './core/types';
import {parseLogLevel} from "./utils/helpers";
import {convertKeysToCamelCase, isWindowAvailable} from "./utils/common";

// Global flag for multi-instance safety
const USERMAVEN_AUTOCAPTURE_INITIALIZED_BASE = '__USERMAVEN_AUTOCAPTURE_INITIALIZED__';
function usermavenClient(config: Partial<Config>): UsermavenClient {
    const cleanConfig = JSON.parse(JSON.stringify(config));
    const camelCaseConfig = convertKeysToCamelCase(cleanConfig);
    const mergedConfig: Config = { ...defaultConfig, ...camelCaseConfig } as Config;

    if (!mergedConfig.key) {
        throw new Error('API key is required!');
    }

    if (!mergedConfig.trackingHost) {
        throw new Error('Tracking host is required!');
    }

    // Create a project-specific key for the global flag
    const projectKey = mergedConfig.key || '';
    const USERMAVEN_AUTOCAPTURE_INITIALIZED_KEY = `${USERMAVEN_AUTOCAPTURE_INITIALIZED_BASE}${projectKey}`;

    // Check for existing autocapture initialization
    if (isWindowAvailable() && mergedConfig.autocapture && (window as any)[USERMAVEN_AUTOCAPTURE_INITIALIZED_KEY]) {
        console.warn('Usermaven: Autocapture already initialized in another instance, skipping duplicate initialization.');
        mergedConfig.disableAutocaptureListenerRegistration = true;
    }

    // Set global flag if autocapture is enabled and not disabled
    if (isWindowAvailable() && mergedConfig.autocapture && !mergedConfig.disableAutocaptureListenerRegistration) {
        (window as any)[USERMAVEN_AUTOCAPTURE_INITIALIZED_KEY] = true;
    }

    return new UsermavenClient(mergedConfig);
}

function initFromScript(script: HTMLScriptElement) {

    const config: Partial<Config> = {
        key: script.getAttribute('data-key') || undefined,
        trackingHost: script.getAttribute('data-tracking-host') || 'https://events.usermaven.com',
        logLevel: parseLogLevel(script.getAttribute('data-log-level')),
        autocapture: script.getAttribute('data-autocapture') === 'true',
        formTracking: script.getAttribute('data-form-tracking') === 'false' ? false : script.getAttribute('data-form-tracking') === 'true' ? 'all' : script.getAttribute('data-form-tracking') as 'tagged' | 'none',
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

    // Additional config for strict mode
    if (config.privacyPolicy === 'strict') {
        config.cookiePolicy = 'strict';
        config.ipPolicy = 'strict';
    }

    if (config.cookiePolicy === 'comply' && config.useBeaconApi) {
        config.cookiePolicy = "strict";
    }

    const client = usermavenClient(config);
    const namespace = config.namespace || 'usermaven';

    // if browser environment, send the first pageview
    if (isWindowAvailable()) {
        client.pageview();
    }

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

if (isWindowAvailable()) {
    // Browser-specific initialization
// Wrap the initialization in an IIFE
    (function (document, window) {
        // Capture the current scripts
        const currentScript = document.currentScript as HTMLScriptElement;

        function initialize() {
            if (currentScript && currentScript.src.includes('lib.js')) {
                initFromScript(currentScript);
            }
        }

        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
            // If the scripts is loaded with defer or async, we need to wait for the DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initialize);
            } else {
                initialize();
            }
        }
    })(document, window);
}

export { usermavenClient, UsermavenClient, Config as UsermavenOptions, UserProps, EventPayload, LogLevel, ClientProperties };
