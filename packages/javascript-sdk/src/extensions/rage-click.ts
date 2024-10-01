import { UsermavenClient } from '../core/client';
import { _safewrap_instance_methods } from '../utils/common';

export class RageClick {
    private client: UsermavenClient;
    private clicks: { x: number; y: number; timestamp: number }[] = [];
    private threshold = 3;
    private timeWindow = 1000;
    private distanceThreshold = 30;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.initializeEventListener();
        _safewrap_instance_methods(this);
    }

    private initializeEventListener(): void {
        document.addEventListener('click', this.handleClick.bind(this));
    }

    public click(x: number, y: number, timestamp: number): void {
        const click = { x, y, timestamp };

        this.clicks = this.clicks.filter(c => timestamp - c.timestamp < this.timeWindow);
        this.clicks.push(click);

        if (this.clicks.length >= this.threshold) {
            this.checkRageClick();
        }
    }

    private handleClick(event: MouseEvent): void {
        this.click(event.clientX, event.clientY, Date.now());
    }

    private checkRageClick(): void {
        const isRageClick = this.clicks.every((c, i) => {
            if (i === 0) return true;
            const prev = this.clicks[i - 1];
            const distance = Math.sqrt(Math.pow(c.x - prev.x, 2) + Math.pow(c.y - prev.y, 2));
            return distance < this.distanceThreshold;
        });

        if (isRageClick) {
            this.sendRageClickEvent();
        }
    }

    private sendRageClickEvent(): void {
        const lastClick = this.clicks[this.clicks.length - 1];
        const element = document.elementFromPoint(lastClick.x, lastClick.y);

        this.client.track('$rage_click', {
            clicks: this.clicks,
            element: element ? this.getElementInfo(element) : null,
        });

        this.clicks = [];
    }

    private getElementInfo(element: Element): object {
        return {
            tag_name: element.tagName.toLowerCase(),
            id: element.id,
            class_name: element.className,
            text_content: this.sanitizeText(element.textContent || ''),
        };
    }

    private sanitizeText(text: string): string {
        // Remove any HTML tags
        text = text.replace(/<[^>]*>/g, '');

        // Encode special characters
        text = this.encodeHtml(text);

        // Truncate long strings
        const maxLength = 255;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }

        return text;
    }

    private encodeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
