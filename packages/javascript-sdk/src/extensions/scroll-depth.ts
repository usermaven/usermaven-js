import { UsermavenClient } from '../core/client';
import { debounce } from '../utils/helpers';

export class ScrollDepth {
    private client: UsermavenClient;
    private maxScrollDepth: number = 0;
    private milestones: number[] = [25, 50, 75, 90];

    constructor(client: UsermavenClient) {
        this.client = client;
        this.initializeEventListener();
    }

    private initializeEventListener(): void {
        window.addEventListener('scroll', debounce(this.handleScroll.bind(this), 250));
    }

    private handleScroll(): void {
        const scrollPercentage = this.getScrollPercentage();

        if (scrollPercentage > this.maxScrollDepth) {
            this.maxScrollDepth = scrollPercentage;
            this.checkMilestones(scrollPercentage);
        }
    }

    private getScrollPercentage(): number {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    }

    private checkMilestones(scrollPercentage: number): void {
        const reachedMilestones = this.milestones.filter(milestone => scrollPercentage >= milestone);

        reachedMilestones.forEach(milestone => {
            this.client.track('scroll_depth', { depth: milestone });
            this.milestones = this.milestones.filter(m => m !== milestone);
        });
    }
}
