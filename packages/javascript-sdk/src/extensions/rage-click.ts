import { UsermavenClient } from '../core/client';

export class RageClick {
    private client: UsermavenClient;
    private clicks: { x: number; y: number; timestamp: number }[] = [];
    private threshold = 3;
    private timeWindow = 1000;
    private distanceThreshold = 30;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.initializeEventListener();
    }

    private initializeEventListener(): void {
        document.addEventListener('click', this.handleClick.bind(this));
    }

    private handleClick(event: MouseEvent): void {
        const now = Date.now();
        const click = { x: event.clientX, y: event.clientY, timestamp: now };

        this.clicks = this.clicks.filter(c => now - c.timestamp < this.timeWindow);
        this.clicks.push(click);

        if (this.clicks.length >= this.threshold) {
            const isRageClick = this.clicks.every((c, i) => {
                if (i === 0) return true;
                const prev = this.clicks[i - 1];
                const distance = Math.sqrt(Math.pow(c.x - prev.x, 2) + Math.pow(c.y - prev.y, 2));
                return distance < this.distanceThreshold;
            });

            if (isRageClick) {
                this.client.track('rage_click', {
                    clicks: this.clicks,
                    element: (event.target as HTMLElement).tagName,
                });
                this.clicks = [];
            }
        }
    }
}
