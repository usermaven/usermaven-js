import { useState, useEffect, useCallback, useRef } from 'react';
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";

// Type for the hook options
interface UsePageViewOptions {
    before?: (usermaven: UsermavenClient) => void;
    typeName?: string;
    payload?: EventPayload;
}

// Custom hook to track URL changes safely
function useUrlChange() {
    const [url, setUrl] = useState<string>('');
    const isClient = typeof window !== 'undefined';

    useEffect(() => {
        if (!isClient) return;

        // Initialize with current URL
        setUrl(window.location.href);

        const handleUrlChange = () => {
            setUrl(window.location.href);
        };

        // Store original history methods
        const history = window.history;
        const originalPushState = history.pushState.bind(history);
        const originalReplaceState = history.replaceState.bind(history);

        // Wrap history methods
        const wrapHistoryMethod = (original: Function) => {
            return function (this: History, ...args: any[]) {
                const result = original.apply(this, args);
                handleUrlChange();
                return result;
            };
        };

        // Replace history methods
        history.pushState = wrapHistoryMethod(originalPushState);
        history.replaceState = wrapHistoryMethod(originalReplaceState);

        // Add popstate listener
        window.addEventListener('popstate', handleUrlChange);

        // Cleanup
        return () => {
            window.removeEventListener('popstate', handleUrlChange);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, [isClient]);

    return url;
}

// usePageView hook
function usePageView(
    usermaven: UsermavenClient | null,
    opts: UsePageViewOptions = {}
): UsermavenClient | null {
    const url = useUrlChange();
    const isClient = typeof window !== 'undefined';
    const lastTrackedUrl = useRef<string>('');

    const trackPageView = useCallback(() => {
        if (!isClient || !usermaven) return;

        // Get current URL
        const currentUrl = window.location.href;

        // Prevent duplicate tracking of the same URL
        if (lastTrackedUrl.current === currentUrl) return;
        lastTrackedUrl.current = currentUrl;

        // Execute before callback if provided
        if (opts.before) {
            opts.before(usermaven);
        }

        // Track the page view
        try {
            usermaven.track(opts?.typeName || 'pageview', {
                ...opts.payload,
                url: currentUrl,
                path: window.location.pathname,
                referrer: document.referrer || '',
                title: document.title,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Silently handle errors in production
            console.warn('Usermaven pageview tracking error:', error);
        }
    }, [usermaven, opts.before, opts.typeName, opts.payload, isClient]);

    useEffect(() => {
        if (url) {
            trackPageView();
        }
    }, [url, trackPageView]);

    return usermaven;
}

export default usePageView;