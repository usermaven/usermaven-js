// src/tracking/autocapture.ts
import { UsermavenClient } from '../core/client';
import { debounce } from '../utils/helpers';

export class AutoCapture {
    private client: UsermavenClient;
    private isListening: boolean = false;

    constructor(client: UsermavenClient) {
        this.client = client;
    }

    public start(): void {
        if (!this.isListening) {
            this.initializeEventListeners();
            this.isListening = true;
        }
    }

    public stop(): void {
        if (this.isListening) {
            this.removeEventListeners();
            this.isListening = false;
        }
    }

    private initializeEventListeners(): void {
        document.addEventListener('click', this.handleClick.bind(this), true);
        document.addEventListener('change', this.handleChange.bind(this), true);
        document.addEventListener('submit', this.handleSubmit.bind(this), true);
        window.addEventListener('scroll', debounce(this.handleScroll.bind(this), 500), true);
        window.addEventListener('popstate', this.handlePopState.bind(this));

        // Optional: for visibility changes (in old code related to scroll-depth)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    private removeEventListeners(): void {
        document.removeEventListener('click', this.handleClick.bind(this), true);
        document.removeEventListener('change', this.handleChange.bind(this), true);
        document.removeEventListener('submit', this.handleSubmit.bind(this), true);
        window.removeEventListener('scroll', debounce(this.handleScroll.bind(this), 500), true);
        window.removeEventListener('popstate', this.handlePopState.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }



    private getEventTarget(event: Event): HTMLElement | null {
        return (event.target as HTMLElement) || null;
    }

    private shouldCaptureEvent(element: HTMLElement, event: Event): boolean {
        // Exclude elements with 'um-no-capture' class or its parents
        let currentElement = element;
        while (currentElement) {
            if (currentElement.classList.contains('um-no-capture')) {
                return false;
            }
            currentElement = currentElement.parentElement as HTMLElement;
        }


        const config = this.client.getConfig();


        if (config.exclude) {
            const excludeList = config.exclude.split(',');
            const currentUrl = window.location.href;
            if (excludeList.some((pattern) => new RegExp(pattern).test(currentUrl))) {
                return false; // Exclude the event if URL matches the exclude pattern
            }
        }

        return true;
    }


    private captureEventData(element: HTMLElement, eventName: string): void {
        if (!this.shouldCaptureEvent(element, new Event(eventName))) {
            return;
        }

        const attributes = {
            tag_name: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            attr__id: element.id,
            attr__class: element.className,
            el_text: element.textContent?.trim().substring(0, this.client.getConfig().propertiesStringMaxLength || 50) || "",
            event_type: '$autocapture',
            ...(this.getFormFieldValues(element))
        };

        this.client.track('$autocapture', { autocapture_attributes: attributes });
    }


    private handleClick(event: MouseEvent): void {
        this.captureEventData(event.target as HTMLElement, 'click');
    }

    private handleChange(event: Event): void {
        this.captureEventData(event.target as HTMLElement, 'change');
    }


    private handleSubmit(event: Event): void {
        this.captureEventData(event.target as HTMLElement, 'submit');
    }

    private handleScroll(): void {
        const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );

        // Send Scroll Depth Event
        this.client.track('$scroll', { percent: scrollPercentage });

    }

    private handlePopState(): void {
        this.client.track('$popstate'); // consider pageview?
    }

    private handleVisibilityChange(): void {
        if (document.visibilityState === 'hidden') {
            this.handleScroll(); // Capture scroll depth when page becomes hidden
        }
    }

    private getFormFieldValues(element: HTMLElement) : Record<string, any> {
        if (element.tagName.toLowerCase() === 'form') {
            const form = element as HTMLFormElement;
            const formData = new FormData(form);
            const formFields: { [key: string]: string } = {};

            formData.forEach((value, key) => {
                if (typeof value === 'string') {
                    formFields[key] = value;
                }
            });

            return { form_fields: formFields };
        }
        return {}; // Return empty object for non-form elements
    }

}
