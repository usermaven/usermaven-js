import {
    _bind_instance_methods,
    _each,
    _extend,
    _includes,
    _isFunction,
    _isUndefined,
    _register_event,
    _safewrap_instance_methods,
    _trim
} from '../utils/common';
import {
    getClassName,
    getSafeText,
    isElementNode,
    isSensitiveElement,
    isTag,
    isTextNode,
    shouldCaptureDomEvent,
    shouldCaptureElement,
    shouldCaptureValue,
    usefulElements,
    isAngularStyleAttr,
    isDocumentFragment,
} from '../utils/autocapture-utils';
import { getLogger } from '../utils/logger';
import {ScrollDepth} from "../extensions/scroll-depth";
import {UsermavenClient} from "@/core/client";
import {Config} from "../core/config";
import {EventPayload} from "../core/types";

class AutoCapture {
    private client: UsermavenClient;
    private options: Config;
    private scrollDepth: ScrollDepth | null = null;

    // Constants for custom attributes
    static readonly FORCE_CAPTURE_ATTR = 'data-um-force-capture';
    static readonly PREVENT_CAPTURE_ATTR = 'data-um-no-capture';

    constructor(client: UsermavenClient, options: Config) {
        this.client = client;
        this.options = options;
        this.scrollDepth = new ScrollDepth(client);
        _bind_instance_methods(this);
        _safewrap_instance_methods(this);
    }

    public init(): void {
        if (!(document && document.body)) {
            getLogger().debug('Document not ready yet, trying again in 500 milliseconds...');
            setTimeout(() => this.init(), 500);
            return;
        }

        this.addDomEventHandlers();
    }

    private addDomEventHandlers(): void {
        const handler = (e: Event) => {
            e = e || window.event;
            this.captureEvent(e);
        };

        _register_event(document, 'submit', handler, false, true);
        _register_event(document, 'change', handler, false, true);
        _register_event(document, 'click', handler, false, true);
        _register_event(document, 'visibilitychange', handler, false, true);
        _register_event(document, 'scroll', handler, false, true);
        _register_event(window, 'popstate', handler, false, true);
    }

    private isPageRefresh(): boolean {
        if ('PerformanceNavigationTiming' in window) {
            const perfEntries = performance.getEntriesByType('navigation');
            if (perfEntries.length > 0) {
                const navEntry = perfEntries[0] as PerformanceNavigationTiming;
                return navEntry.type === 'reload';
            }
        }
        // Fallback to the old API if PerformanceNavigationTiming is not supported
        return (performance.navigation && performance.navigation.type === 1);
    }

    private captureEvent(e: Event): boolean | void {
        let target = this.getEventTarget(e);
        if (isTextNode(target)) {
            target = (target.parentNode || null) as Element | null;
        }

        if (e.type === 'scroll') {
            this.scrollDepth?.track();
            return true;
        }

        if ((e.type === 'visibilitychange' && document.visibilityState === 'hidden') || e.type === 'popstate') {
            if (!this.isPageRefresh()) {
                this.scrollDepth?.send();
            }
            return true;
        }

        if (target && this.shouldCaptureElement(target, e)) {
            const targetElementList = this.getElementList(target);
            const elementsJson = this.getElementsJson(targetElementList, e);

            const props = _extend(
                this.getDefaultProperties(e.type),
                {
                    $elements: elementsJson,
                }
            );

            this.client.track('$autocapture', props);
            return true;
        }
    }

    private shouldCaptureElement(element: Element, event: Event): boolean {
        // Check for force capture attribute
        if (element.hasAttribute(AutoCapture.FORCE_CAPTURE_ATTR)) {
            return true;
        }

        // Check for prevent capture attribute
        if (element.hasAttribute(AutoCapture.PREVENT_CAPTURE_ATTR)) {
            return false;
        }

        // Default capture logic
        return shouldCaptureDomEvent(element, event);
    }

    private getEventTarget(e: Event): Element | null {
        if (typeof e.target === 'undefined') {
            return (e.srcElement as Element) || null;
        } else {
            if ((e.target as HTMLElement)?.shadowRoot) {
                return (e.composedPath()[0] as Element) || null;
            }
            return (e.target as Element) || null;
        }
    }

    private getElementList(target: Element): Element[] {
        const elementList: Element[] = [target];
        let curEl: Element | ParentNode = target;
        while (curEl.parentNode && !isTag(curEl as Element, 'body')) {
            if (isDocumentFragment(curEl.parentNode)) {
                elementList.push((curEl.parentNode as any).host);
                curEl = (curEl.parentNode as any).host;
            } else {
                elementList.push(curEl.parentNode as Element);
                curEl = curEl.parentNode;
            }
        }
        return elementList;
    }

    private getElementsJson(targetElementList: Element[], e: Event): any[] {
        const elementsJson: any[] = [];
        let href: string | null = null;
        let explicitNoCapture = false;

        _each(targetElementList, (el) => {
            // Check for 'a' tag and capture href
            if (isTag(el, 'a')) {
                const hrefAttr = el.getAttribute('href');
                if (hrefAttr !== null && shouldCaptureElement(el) && shouldCaptureValue(hrefAttr)) {
                    href = hrefAttr;
                }
            }

            // Check for 'ph-no-capture' class
            const classes = getClassName(el).split(' ');
            if (_includes(classes, 'ph-no-capture')) {
                explicitNoCapture = true;
            }

            elementsJson.push(this.getPropertiesFromElement(el));
        });

        if (!this.options.maskAllText) {
            elementsJson[0]['$el_text'] = this.sanitizeText(getSafeText(targetElementList[0]));
        }

        // Add href to the first element if it exists
        if (href !== null) {
            elementsJson[0]['attr__href'] = href
        }

        return explicitNoCapture ? [] : elementsJson;
    }

    private getPropertiesFromElement(element: Element): any {
        const props: any = {
            tag_name: element.tagName.toLowerCase(),
        };

        if (usefulElements.indexOf(props.tag_name) > -1 && !this.options.maskAllText) {
            props['$el_text'] = this.sanitizeText(getSafeText(element));
        }

        const classes = getClassName(element);
        if (classes.length > 0) {
            props['classes'] = classes.split(' ').filter((c) => c !== '');
        }

        _each(element.attributes, (attr: Attr) => {
            if (isSensitiveElement(element) && ['name', 'id', 'class'].indexOf(attr.name) === -1) return;

            if (!this.options.maskAllElementAttributes && shouldCaptureValue(attr.value) && !isAngularStyleAttr(attr.name)) {
                props['attr__' + attr.name] = this.sanitizeAttributeValue(attr.name, attr.value);
            }
        });

        let nthChild = 1;
        let nthOfType = 1;
        let currentElem: Element | null = element;
        while ((currentElem = this.previousElementSibling(currentElem))) {
            nthChild++;
            if (currentElem.tagName === element.tagName) {
                nthOfType++;
            }
        }
        props['nth_child'] = nthChild;
        props['nth_of_type'] = nthOfType;

        return props;
    }

    private previousElementSibling(el: Element): Element | null {
        if (el.previousElementSibling) {
            return el.previousElementSibling;
        } else {
            do {
                el = el.previousSibling as Element;
            } while (el && !isElementNode(el));
            return el;
        }
    }

    private getDefaultProperties(eventType: string): EventPayload {
        return {
            $event_type: eventType,
            $ce_version: 1,
        };
    }

    // Input sanitization and XSS prevention methods

    private sanitizeText(text: string): string {
        // Remove any HTML tags
        text = text.replace(/<[^>]*?>/g, '');

        // Encode special characters
        text = this.encodeHtml(text);

        // Truncate long strings
        const maxLength = this.options.propertiesStringMaxLength || 255;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }

        return text;
    }

    private sanitizeUrl(url: string): string {
        console.log('url', url);
        if (!url) return '';
        try {
            const parsedUrl = new URL(url, window.location.href);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return '';
            }
            return encodeURI(parsedUrl.toString());
        } catch (e) {
            // If URL parsing fails, return the original url after basic sanitization
            return this.encodeHtml(url);
        }
    }

    private sanitizeAttributeValue(name: string, value: string): string {
        // Sanitize based on attribute name
        switch (name.toLowerCase()) {
            case 'href':
            case 'src':
                return this.sanitizeUrl(value);
            default:
                return this.encodeHtml(value);
        }
    }

    private encodeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public static enabledForProject(token: string, numBuckets: number = 10, numEnabledBuckets: number = 10): boolean {
        if (!token) {
            return false;
        }
        let charCodeSum = 0;
        for (let i = 0; i < token.length; i++) {
            charCodeSum += token.charCodeAt(i);
        }
        return charCodeSum % numBuckets < numEnabledBuckets;
    }

    public static isBrowserSupported(): boolean {
        return _isFunction(document.querySelectorAll);
    }
}

export default AutoCapture;
