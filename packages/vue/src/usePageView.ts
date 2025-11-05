import { ref, onMounted, onUnmounted, watch } from '@vue/runtime-core';
import useUsermaven from './useUsermaven';
import { EventPayload, UsermavenClient } from '@usermaven/sdk-js';

// Composable to track URL changes
function useUrlChange() {
  const url = ref(window.location.href);
  const lastUrl = ref(window.location.href);
  const originalPushState = ref<typeof window.history.pushState>();
  const originalReplaceState = ref<typeof window.history.replaceState>();

  const handleUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl.value) {
      lastUrl.value = currentUrl;
      url.value = currentUrl;
    }
  };

  onMounted(() => {
    window.addEventListener('popstate', handleUrlChange);

    // Store original history methods
    originalPushState.value = window.history.pushState;
    originalReplaceState.value = window.history.replaceState;

    // Override history methods
    window.history.pushState = function (...args: any[]) {
      if (originalPushState.value) {
        originalPushState.value.apply(window.history, args as any);
      }
      handleUrlChange();
    };

    window.history.replaceState = function (...args: any[]) {
      if (originalReplaceState.value) {
        originalReplaceState.value.apply(window.history, args as any);
      }
      handleUrlChange();
    };
  });

  onUnmounted(() => {
    window.removeEventListener('popstate', handleUrlChange);
    if (originalPushState.value && originalReplaceState.value) {
      window.history.pushState = originalPushState.value;
      window.history.replaceState = originalReplaceState.value;
    }
  });

  return url;
}

// usePageView composable
export default function usePageView(
  opts: {
    before?: (usermaven: UsermavenClient) => void;
    typeName?: string;
    payload?: EventPayload;
  } = {},
): UsermavenClient {
  const url = useUrlChange();
  const usermaven = useUsermaven();
  const lastTrackedUrl = ref('');

  const trackPageView = () => {
    if (url.value !== lastTrackedUrl.value) {
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
      lastTrackedUrl.value = url.value;
    }
  };

  watch(url, () => {
    trackPageView();
  });

  onMounted(() => {
    trackPageView();
  });

  return usermaven;
}
