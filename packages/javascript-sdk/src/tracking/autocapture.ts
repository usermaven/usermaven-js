import {
    _bind_instance_methods,
    _each,
    _extend,
    _includes,
    _isFunction,
    _isUndefined,
    _register_event,
    _safewrap_instance_methods,
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
import {Config} from "../core/types";
import {AutoCaptureCustomProperty, EventPayload, Properties} from "../core/types";

class AutoCapture {
    private client: UsermavenClient;
    private options: Config;
    private scrollDepth: ScrollDepth | null = null;
    private customProperties: AutoCaptureCustomProperty[] = [];
    private domHandlersAttached: boolean = false;

    // Constants for custom attributes
    static readonly FORCE_CAPTURE_ATTR = 'data-um-force-capture';
    static readonly PREVENT_CAPTURE_ATTR = 'data-um-no-capture';

    constructor(client: UsermavenClient, options: Config,
                private logger = getLogger()
    ) {
        this.client = client;
        this.options = options;
        this.scrollDepth = new ScrollDepth(client);
        _bind_instance_methods(this);
        _safewrap_instance_methods(this);
    }

    private isBrowserSupported(): boolean {
        return typeof document !== 'undefined' && typeof document.addEventListener === 'function';
    }

    public init(): void {
        if (!this.isBrowserSupported()) {
            this.logger.debug('Browser not supported for autocapture');
            return;
        }

        if (this.domHandlersAttached) {
            this.logger.debug('Autocapture already initialized.');
            return;
        }

        if (!(document && document.body)) {
            this.logger.debug('Document not ready yet, trying again in 500 milliseconds...');
            setTimeout(() => this.init(), 500);
            return;
        }

        this.addDomEventHandlers();
        this.domHandlersAttached = true;
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
        /*** Don't mess with this code without running IE8 tests on it ***/
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

        if (target && shouldCaptureDomEvent(target, e)) {
            const targetElementList = [target]
            let curEl = target
            while (curEl.parentNode && !isTag(curEl, 'body')) {
                if (isDocumentFragment(curEl.parentNode)) {
                    targetElementList.push((curEl.parentNode as any).host)
                    curEl = (curEl.parentNode as any).host
                    continue
                }
                targetElementList.push(curEl.parentNode as Element)
                curEl = curEl.parentNode as Element
            }

            const elementsJson: Properties[] = []
            let href,
                explicitNoCapture = false
            _each(targetElementList, (el) => {
                const shouldCaptureEl = shouldCaptureElement(el)

                // if the element or a parent element is an anchor tag
                // include the href as a property
                if (el.tagName.toLowerCase() === 'a') {
                    href = el.getAttribute('href')
                    href = shouldCaptureEl && shouldCaptureValue(href) && href
                }

                // allow users to programmatically prevent capturing of elements by adding class 'ph-no-capture'
                const classes = getClassName(el).split(' ')
                if (_includes(classes, 'ph-no-capture')) {
                    explicitNoCapture = true
                }

                elementsJson.push(
                    this.getPropertiesFromElement(
                        el,
                        this.options.maskAllElementAttributes ?? false,
                        this.options.maskAllText ?? false
                    )
                )
            })

            if (!this.options.maskAllText) {
                elementsJson[0]['$el_text'] = getSafeText(target)
            }

            if (href) {
                elementsJson[0]['attr__href'] = href
            }

            if (explicitNoCapture) {
                return false
            }

            const props = _extend(
                this.getDefaultProperties(e.type),
                {
                    $elements: elementsJson,
                },
                this.getCustomProperties(targetElementList)
            )
            this.client.track('$autocapture', props);
            return true
        }
    }

    private getCustomProperties(targetElementList: Element[]): Properties {
        const props: Properties = {} // will be deleted
        _each(this.customProperties, (customProperty) => {
            _each(customProperty['event_selectors'], (eventSelector) => {
                const eventElements = document.querySelectorAll(eventSelector)
                _each(eventElements, (eventElement) => {
                    if (_includes(targetElementList, eventElement) && shouldCaptureElement(eventElement)) {
                        props[customProperty['name']] = this.extractCustomPropertyValue(customProperty)
                    }
                })
            })
        })
        return props
    }

    private extractCustomPropertyValue(customProperty: AutoCaptureCustomProperty): string {
        const propValues: string[] = []
        _each(document.querySelectorAll(customProperty['css_selector']), function (matchedElem) {
            let value

            if (['input', 'select'].indexOf(matchedElem.tagName.toLowerCase()) > -1) {
                value = matchedElem['value']
            } else if (matchedElem['textContent']) {
                value = matchedElem['textContent']
            }

            if (shouldCaptureValue(value)) {
                propValues.push(value)
            }
        })
        return propValues.join(', ')
    }


    private getEventTarget(e: Event): Element | null {
        // https://developer.mozilla.org/en-US/docs/Web/API/Event/target#Compatibility_notes
        if (typeof e.target === 'undefined') {
            return (e.srcElement as Element) || null
        } else {
            if ((e.target as HTMLElement)?.shadowRoot) {
                return (e.composedPath()[0] as Element) || null
            }
            return (e.target as Element) || null
        }
    }

    private getPropertiesFromElement(elem: Element, maskInputs: boolean, maskText: boolean): Properties {
        const tag_name = elem.tagName.toLowerCase()
        const props: Properties = {
            tag_name: tag_name,
        }
        if (usefulElements.indexOf(tag_name) > -1 && !maskText) {
            props['$el_text'] = getSafeText(elem)
        }

        const classes = getClassName(elem)
        if (classes.length > 0)
            props['classes'] = classes.split(' ').filter(function (c) {
                return c !== ''
            })

        _each(elem.attributes, function (attr: Attr) {
            // Only capture attributes we know are safe
            if (isSensitiveElement(elem) && ['name', 'id', 'class'].indexOf(attr.name) === -1) return

            if (!maskInputs && shouldCaptureValue(attr.value) && !isAngularStyleAttr(attr.name)) {
                props['attr__' + attr.name] = attr.value
            }
        })

        let nthChild = 1
        let nthOfType = 1
        let currentElem: Element | null = elem
        while ((currentElem = this.previousElementSibling(currentElem))) {
            // eslint-disable-line no-cond-assign
            nthChild++
            if (currentElem.tagName === elem.tagName) {
                nthOfType++
            }
        }
        props['nth_child'] = nthChild
        props['nth_of_type'] = nthOfType

        return props
    }

    private previousElementSibling(el: Element): Element | null {
        if (el.previousElementSibling) {
            return el.previousElementSibling
        } else {
            let _el: Element | null = el
            do {
                _el = _el.previousSibling as Element | null // resolves to ChildNode->Node, which is Element's parent class
            } while (_el && !isElementNode(_el))
            return _el
        }
    }

    private getDefaultProperties(eventType: string): EventPayload {
        return {
            $event_type: eventType,
            $ce_version: 1,
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
}

export default AutoCapture;
