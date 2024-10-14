import { useState, useEffect, useCallback } from 'react';
import useUsermaven from "./useUsermaven";
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";

// Custom hook to track URL changes
function useUrlChange() {
    const [url, setUrl] = useState(window.location.href);

    useEffect(() => {
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
function usePageView(opts: {
    before?: (usermaven: UsermavenClient) => void,
    typeName?: string,
    payload?: EventPayload
} = {}): UsermavenClient {
    const url = useUrlChange();
    const usermaven = useUsermaven();

    const trackPageView = useCallback(() => {
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
        trackPageView();
    }, [url, trackPageView]);

    return usermaven;
}

export default usePageView;
