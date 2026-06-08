import { UsermavenClient } from '../core/client';
/**
 * Tracks SPA URL changes after the first page load.
 * Initial pageview is sent by script-tag init or explicit client.pageview() calls.
 */
export class PageviewTracking {
  private client: UsermavenClient;
  private lastPageUrl: string;

  constructor(client: UsermavenClient) {
    this.client = client;
    this.lastPageUrl = window.location.href;
    this.trackInitialPageview();
    this.initializePageviewTracking();
  }

  /**
   * No-op by design: lastPageUrl is set to window.location.href before this runs,
   * and trackPageview() only sends after a URL change. Initial pageview is owned
   * by script-tag init or explicit client.pageview() calls.
   *
   * If we change this to emit the initial pageview, UsermavenClient must initialize
   * anonymousId before constructing PageviewTracking, because pageview payloads
   * read anonymousId during event creation.
   */
  private trackInitialPageview(): void {
    this.trackPageview();
  }

  private initializePageviewTracking(): void {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', this.handlePageview.bind(this));

    // Handle programmatic navigation in SPAs
    const originalPushState = history.pushState;
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState.apply(history, args);
      this.handlePageview();
    };

    // Handle hash changes (for SPAs that use hash-based routing)
    window.addEventListener('hashchange', this.handlePageview.bind(this));

    // Periodically check for changes (catches any missed navigations)
    setInterval(this.checkForUrlChange.bind(this), 1000);
  }

  private handlePageview(): void {
    this.trackPageview();
  }

  private checkForUrlChange(): void {
    if (window.location.href !== this.lastPageUrl) {
      this.trackPageview();
    }
  }

  private trackPageview(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastPageUrl) {
      this.lastPageUrl = currentUrl;
      // SPA navigations don't share the initial load's unload risk, so flushImmediately is not needed.
      this.client.track('pageview', {
        url: currentUrl,
        referrer: document.referrer,
        title: document.title,
      });
    }
  }
}
