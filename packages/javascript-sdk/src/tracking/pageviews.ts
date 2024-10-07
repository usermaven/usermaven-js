import { UsermavenClient } from '../core/client';

export class PageviewTracking {
    private client: UsermavenClient;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.trackInitialPageview();
        this.initializePageviewTracking();
    }

    private trackInitialPageview(): void {
        this.client.track('pageview');
    }

    private initializePageviewTracking(): void {
        window.addEventListener('popstate', this.handlePageview.bind(this));
        const originalPushState = history.pushState;
        history.pushState = (...args: Parameters<typeof history.pushState>) => {
            originalPushState.apply(history, args);
            this.handlePageview();
        };
    }

    private handlePageview(): void {
        this.client.track('pageview');
    }
}
