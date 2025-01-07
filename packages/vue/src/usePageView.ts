import { ref, onMounted, onUnmounted, watch } from 'vue'
import useUsermaven from './useUsermaven'
import { EventPayload, UsermavenClient } from '@usermaven/sdk-js'

// Composable to track URL changes
function useUrlChange() {
  const url = ref(window.location.href)
  const lastUrl = ref(window.location.href)
  let originalPushState: typeof window.history.pushState
  let originalReplaceState: typeof window.history.replaceState

  const handleUrlChange = () => {
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl.value) {
      lastUrl.value = currentUrl
      url.value = currentUrl
    }
  }

  onMounted(() => {
    window.addEventListener('popstate', handleUrlChange)

    // Store original history methods
    originalPushState = window.history.pushState.bind(window.history)
    originalReplaceState = window.history.replaceState.bind(window.history)

    // Override history methods
    window.history.pushState = function (...args: Parameters<typeof originalPushState>) {
      originalPushState.apply(this, args)
      handleUrlChange()
    }

    window.history.replaceState = function (...args: Parameters<typeof originalReplaceState>) {
      originalReplaceState.apply(this, args)
      handleUrlChange()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handleUrlChange)
    if (originalPushState && originalReplaceState) {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  })

  return url
}

// usePageView composable
export default function usePageView(opts: {
  before?: (usermaven: UsermavenClient) => void
  typeName?: string
  payload?: EventPayload
} = {}): UsermavenClient {
  const url = useUrlChange()
  const usermaven = useUsermaven()
  const lastTrackedUrl = ref('')

  const trackPageView = () => {
    if (url.value !== lastTrackedUrl.value) {
      if (opts.before) {
        opts.before(usermaven)
      }
      usermaven.track(opts?.typeName || 'pageview', {
        ...opts.payload,
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title
      })
      lastTrackedUrl.value = url.value
    }
  }

  watch(url, () => {
    trackPageView()
  })

  onMounted(() => {
    trackPageView()
  })

  return usermaven
}
