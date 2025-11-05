import { useState, useEffect, useCallback, useRef } from 'react';
import useUsermaven, { UsermavenClient } from './useUsermaven';
import { EventPayload } from '@usermaven/sdk-js';

// Custom hook to track URL changes
function useUrlChange() {
  const [url, setUrl] = useState(window.location.href);
  const lastUrlRef = useRef(window.location.href);

  useEffect(() => {
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrlRef.current) {
        lastUrlRef.current = currentUrl;
        setUrl(currentUrl);
      }
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
function usePageView(
  opts: {
    before?: (usermaven: UsermavenClient) => void;
    typeName?: string;
    payload?: EventPayload;
  } = {},
): UsermavenClient {
  const url = useUrlChange();
  const usermaven = useUsermaven();
  const lastTrackedUrl = useRef('');

  const trackPageView = useCallback(() => {
    if (url !== lastTrackedUrl.current) {
      if (opts.before) {
        opts.before(usermaven);
      }
      usermaven.track(opts?.typeName || 'pageview', {
        ...opts.payload,
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
      });
      lastTrackedUrl.current = url;
    }
  }, [usermaven, url, opts.before, opts.typeName, opts.payload]);

  useEffect(() => {
    trackPageView();
  }, [url, trackPageView]);

  return usermaven;
}

export default usePageView;
