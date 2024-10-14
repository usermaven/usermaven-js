import { useState, useEffect, useCallback } from 'react';
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";

// Custom hook to track URL changes
function useUrlChange() {
    const [url, setUrl] = useState('');

    useEffect(() => {
        // This effect will only run on the client-side
        setUrl(window.location.href);

        const handleUrlChange = () => {
            setUrl(window.location.href);
        };

        window.addEventListener('popstate', handleUrlChange);

        // For handling pushState and replaceState
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function () {
            originalPushState.apply(this, arguments as any);
            handleUrlChange();
        };

        window.history.replaceState = function () {
            originalReplaceState.apply(this, arguments as any);
            handleUrlChange();
        };

        return () => {
            window.removeEventListener('popstate', handleUrlChange);
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, []);

    return url;
}

// usePageView hook
function usePageView(usermaven: UsermavenClient,
                     opts: {
                         before?: (usermaven: UsermavenClient) => void,
                         typeName?: string,
                         payload?: EventPayload
                     } = {}): UsermavenClient {

    const url = useUrlChange();

    const trackPageView = useCallback(() => {
        if (typeof window === 'undefined') {
            return; // Skip tracking on server-side
        }

        if (opts.before) {
            opts.before(usermaven);
        }
        usermaven.track(opts?.typeName || 'pageview', {
            ...opts.payload,
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            title: document.title
        });
    }, [usermaven, opts.before, opts.typeName, opts.payload]);

    useEffect(() => {
        if (url) {
            trackPageView();
        }
    }, [url, trackPageView]);

    return usermaven;
}

export default usePageView;
