import { UsermavenClient } from '../core/client';
import { debounce } from '../utils/helpers';

export class ScrollDepth {
    private client: UsermavenClient;
    private maxScrollDepth: number = 0;
    private milestones: Set<number> = new Set([25, 50, 75, 90]);
    private reachedMilestones: Set<number> = new Set();
    private documentElement: HTMLElement;
    private debouncedHandleScroll: (() => void) & { cancel?: () => void };
    private hasSentFinalEvent: boolean = false;
    private scrollTimeout: NodeJS.Timeout | null = null;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.documentElement = document.documentElement;
        this.debouncedHandleScroll = this.createDebouncedScroll(250);
        this.initializeEventListeners();
    }

    private createDebouncedScroll(delay: number): (() => void) & { cancel?: () => void } {
        const debouncedFn = debounce(this.handleScroll.bind(this), delay);
        
        // If your debounce utility doesn't have cancel, create a wrapper
        // that tracks the timeout manually
        const wrapper = () => {
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            this.scrollTimeout = setTimeout(() => {
                this.handleScroll();
                this.scrollTimeout = null;
            }, delay);
        };
        
        wrapper.cancel = () => {
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
                this.scrollTimeout = null;
            }
        };
        
        return wrapper;
    }

    private initializeEventListeners(): void {
        // Regular scroll tracking
        window.addEventListener('scroll', this.debouncedHandleScroll, { passive: true });
        
        // Final flush on page exit
        window.addEventListener('pagehide', this.handlePageExit.bind(this));
        window.addEventListener('beforeunload', this.handlePageExit.bind(this));
        
        // Handle visibility changes (tab switches, minimize)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    public track(): void {
        const scrollDepth = this.getScrollDepth();
        
        // Always update max scroll depth (handles scroll up/down scenarios)
        if (scrollDepth > this.maxScrollDepth) {
            this.maxScrollDepth = scrollDepth;
            this.checkMilestones(scrollDepth);
        }
    }

    public send(eventType: string = "$scroll", specificMilestone?: number): void {
        // Ensure we have the latest max depth
        const currentDepth = this.getScrollDepth();
        this.maxScrollDepth = Math.max(this.maxScrollDepth, currentDepth);
        
        const props = {
            percent: specificMilestone ?? this.maxScrollDepth,
            max_percent: this.maxScrollDepth,
            window_height: this.getWindowHeight(),
            document_height: this.getDocumentHeight(),
            scroll_distance: this.getScrollDistance(),
            is_final: eventType === "$scroll_exit"
        };
        
        this.client.track(eventType, props);
    }

    private handleScroll(): void {
        this.track();
    }

    private handlePageExit(): void {
        if (!this.hasSentFinalEvent) {
            // Cancel pending debounced calls and send immediately
            if (this.debouncedHandleScroll.cancel) {
                this.debouncedHandleScroll.cancel();
            }
            
            // Capture final scroll position
            this.track();
            
            // Send final event with max depth reached
            this.send("$scroll_exit");
            this.hasSentFinalEvent = true;
        }
    }

    private handleVisibilityChange(): void {
        if (document.hidden) {
            // Page is being hidden (tab switch, minimize)
            // Flush current state without marking as final
            this.track();
            this.send("$scroll_checkpoint");
        }
    }

    private getScrollDepth(): number {
        const windowHeight = this.getWindowHeight();
        const docHeight = this.getDocumentHeight();
        const scrollTop = this.getScrollDistance();
        
        // Handle edge case where document is shorter than viewport
        if (docHeight <= windowHeight) {
            return 100;
        }
        
        const trackLength = docHeight - windowHeight;
        const percent = (scrollTop / trackLength) * 100;
        
        return Math.min(100, Math.max(0, Math.round(percent)));
    }

    private getWindowHeight(): number {
        return window.innerHeight || 
               this.documentElement.clientHeight || 
               document.body.clientHeight || 
               0;
    }

    private getDocumentHeight(): number {
        return Math.max(
            document.body.scrollHeight || 0,
            this.documentElement.scrollHeight || 0,
            document.body.offsetHeight || 0,
            this.documentElement.offsetHeight || 0,
            document.body.clientHeight || 0,
            this.documentElement.clientHeight || 0
        );
    }

    private getScrollDistance(): number {
        return window.pageYOffset || 
               this.documentElement.scrollTop || 
               document.body.scrollTop || 
               0;
    }

    private checkMilestones(scrollPercentage: number): void {
        this.milestones.forEach(milestone => {
            if (scrollPercentage >= milestone && !this.reachedMilestones.has(milestone)) {
                this.reachedMilestones.add(milestone);
                
                // Send milestone-specific event
                this.send(`$scroll_milestone_${milestone}`, milestone);
            }
        });
    }

    public destroy(): void {
        // Clean up all event listeners
        window.removeEventListener('scroll', this.debouncedHandleScroll);
        window.removeEventListener('pagehide', this.handlePageExit.bind(this));
        window.removeEventListener('beforeunload', this.handlePageExit.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Send final event if not already sent
        if (!this.hasSentFinalEvent) {
            this.handlePageExit();
        }
    }
}