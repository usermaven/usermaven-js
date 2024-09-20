import { UsermavenClient } from '../core/client';
import { debounce } from '../utils/helpers';

export class AutoCapture {
    private client: UsermavenClient;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        document.addEventListener('click', this.handleClick.bind(this));
        window.addEventListener('scroll', debounce(this.handleScroll.bind(this), 500));
    }

    private handleClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const eventData = {
            autocapture_attributes: {
                tag_name: target.tagName.toLowerCase(),
                classes: Array.from(target.classList),
                attr__id: target.id,
                attr__class: target.className,
                el_text: target.textContent?.trim().substring(0, 50) || "",
                event_type: "click"
            }
        };
        this.client.track('$autocapture', eventData);
    }

    private handleScroll(): void {
        const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        this.client.track('$scroll', { percent: scrollPercentage });
    }
}
