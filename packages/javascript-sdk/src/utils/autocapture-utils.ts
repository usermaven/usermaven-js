/*
 * Get the className of an element, accounting for edge cases where element.className is an object
 * @param {Element} el - element to get the className of
 * @returns {string} the element's class
 */
import { _each, _includes, _isUndefined, _trim } from './common'

export function getClassName(el: Element): string {
    switch (typeof el.className) {
        case 'string':
            return el.className
        // TODO: when is this ever used?
        case 'object': // handle cases where className might be SVGAnimatedString or some other type
            return ('baseVal' in el.className ? (el.className as any).baseVal : null) || el.getAttribute('class') || ''
        default:
            // future proof
            return ''
    }
}

/*
 * Get the direct text content of an element, protecting against sensitive data collection.
 * Concats textContent of each of the element's text node children; this avoids potential
 * collection of sensitive data that could happen if we used element.textContent and the
 * element had sensitive child elements, since element.textContent includes child content.
 * Scrubs values that look like they could be sensitive (i.e. cc or ssn number).
 * @param {Element} el - element to get the text of
 * @returns {string} the element's direct text content
 */
export function getSafeText(el: Element): string {
    let elText = ''

    if (shouldCaptureElement(el) && !isSensitiveElement(el) && el.childNodes && el.childNodes.length) {
        _each(el.childNodes, function (child) {
            if (isTextNode(child) && child.textContent) {
                elText += _trim(child.textContent)
                    // scrub potentially sensitive values
                    .split(/(\s+)/)
                    .filter(shouldCaptureValue)
                    .join('')
                    // normalize whitespace
                    .replace(/[\r\n]/g, ' ')
                    .replace(/[ ]+/g, ' ')
                    // truncate
                    .substring(0, 255)
            }
        })
    }

    return _trim(elText)
}

/*
 * Check whether an element has nodeType Node.ELEMENT_NODE
 * @param {Element} el - element to check
 * @returns {boolean} whether el is of the correct nodeType
 */
export function isElementNode(el: Element | undefined | null): el is HTMLElement {
    return !!el && el.nodeType === 1 // Node.ELEMENT_NODE - use integer constant for browser portability
}

/*
 * Check whether an element is of a given tag type.
 * Due to potential reference discrepancies (such as the webcomponents.js polyfill),
 * we want to match tagNames instead of specific references because something like
 * element === document.body won't always work because element might not be a native
 * element.
 * @param {Element} el - element to check
 * @param {string} tag - tag name (e.g., "div")
 * @returns {boolean} whether el is of the given tag type
 */
export function isTag(el: Element | undefined | null, tag: string): el is HTMLElement {
    return !!el && !!el.tagName && el.tagName.toLowerCase() === tag.toLowerCase()
}

/*
 * Check whether an element has nodeType Node.TEXT_NODE
 * @param {Element} el - element to check
 * @returns {boolean} whether el is of the correct nodeType
 */
export function isTextNode(el: Element | undefined | null): el is HTMLElement {
    return !!el && el.nodeType === 3 // Node.TEXT_NODE - use integer constant for browser portability
}

/*
 * Check whether an element has nodeType Node.DOCUMENT_FRAGMENT_NODE
 * @param {Element} el - element to check
 * @returns {boolean} whether el is of the correct nodeType
 */
export function isDocumentFragment(el: Element | ParentNode | undefined | null): el is DocumentFragment {
    return !!el && el.nodeType === 11 // Node.DOCUMENT_FRAGMENT_NODE - use integer constant for browser portability
}

export const usefulElements = ['a', 'button', 'form', 'input', 'select', 'textarea', 'label']
/*
 * Check whether a DOM event should be "captured" or if it may contain sentitive data
 * using a variety of heuristics.
 * @param {Element} el - element to check
 * @param {Event} event - event to check
 * @returns {boolean} whether the event should be captured
 */
export function shouldCaptureDomEvent(el: Element, event: Event): boolean {
    if (!el || isTag(el, 'html') || !isElementNode(el)) {
        return false
    }

    // Check if current element or any parent has um-no-capture class
    let curEl: Element | null = el;
    while (curEl && !isTag(curEl, 'body')) {
        if (curEl.classList && curEl.classList.contains('um-no-capture')) {
            return false;
        }
        // Handle shadow DOM
        if (curEl.parentNode && isDocumentFragment(curEl.parentNode)) {
            curEl = (curEl.parentNode as any).host;
        } else {
            curEl = curEl.parentNode as Element;
        }
    }

    let parentIsUsefulElement = false;
    curEl = el;
    while (curEl && !isTag(curEl, 'body')) {
        // Handle shadow DOM
        if (curEl.parentNode && isDocumentFragment(curEl.parentNode)) {
            curEl = (curEl.parentNode as any).host;
            if (curEl && usefulElements.indexOf(curEl.tagName.toLowerCase()) > -1) {
                parentIsUsefulElement = true;
            }
            continue;
        }

        const parentNode = curEl.parentNode as Element;
        if (!parentNode) break;

        if (usefulElements.indexOf(parentNode.tagName.toLowerCase()) > -1) {
            parentIsUsefulElement = true;
        } else {
            const compStyles = window.getComputedStyle(parentNode);
            if (compStyles && compStyles.getPropertyValue('cursor') === 'pointer') {
                parentIsUsefulElement = true;
            }
        }
        curEl = parentNode;
    }

    const compStyles = window.getComputedStyle(el);
    if (compStyles && compStyles.getPropertyValue('cursor') === 'pointer' && event.type === 'click') {
        return true;
    }

    const tag = el.tagName.toLowerCase();
    switch (tag) {
        case 'html':
            return false;
        case 'form':
            return event.type === 'submit';
        case 'input':
            return event.type === 'change' || event.type === 'click';
        case 'select':
        case 'textarea':
            return event.type === 'change' || event.type === 'click';
        default:
            if (parentIsUsefulElement) return event.type === 'click';
            return (
                event.type === 'click' &&
                (usefulElements.indexOf(tag) > -1 || el.getAttribute('contenteditable') === 'true')
            );
    }
}

/*
 * Check whether a DOM element should be "captured" or if it may contain sentitive data
 * using a variety of heuristics.
 * @param {Element} el - element to check
 * @returns {boolean} whether the element should be captured
 */
export function shouldCaptureElement(el: Element): boolean {
    for (let curEl = el; curEl.parentNode && !isTag(curEl, 'body'); curEl = curEl.parentNode as Element) {
        const classes = getClassName(curEl).split(' ')
        if (_includes(classes, 'ph-sensitive') || _includes(classes, 'ph-no-capture')) {
            return false
        }
    }

    if (_includes(getClassName(el).split(' '), 'ph-include')) {
        return true
    }

    // don't include hidden or password fields
    const type = (el as HTMLInputElement).type || ''
    if (typeof type === 'string') {
        // it's possible for el.type to be a DOM element if el is a form with a child input[name="type"]
        switch (type.toLowerCase()) {
            case 'hidden':
                return false
            case 'password':
                return false
        }
    }

    // filter out data from fields that look like sensitive fields
    const name = (el as HTMLInputElement).name || el.id || ''
    // See https://github.com/posthog/posthog-js/issues/165
    // Under specific circumstances a bug caused .replace to be called on a DOM element
    // instead of a string, removing the element from the page. Ensure this issue is mitigated.
    if (typeof name === 'string') {
        // it's possible for el.name or el.id to be a DOM element if el is a form with a child input[name="name"]
        const sensitiveNameRegex =
            /^cc|cardnum|ccnum|creditcard|csc|cvc|cvv|exp|pass|pwd|routing|seccode|securitycode|securitynum|socialsec|socsec|ssn/i
        if (sensitiveNameRegex.test(name.replace(/[^a-zA-Z0-9]/g, ''))) {
            return false
        }
    }

    return true
}

/*
 * Check whether a DOM element is 'sensitive' and we should only capture limited data
 * @param {Element} el - element to check
 * @returns {boolean} whether the element should be captured
 */
export function isSensitiveElement(el: Element): boolean {
    // don't send data from inputs or similar elements since there will always be
    // a risk of clientside javascript placing sensitive data in attributes
    const allowedInputTypes = ['button', 'checkbox', 'submit', 'reset']
    if (
        (isTag(el, 'input') && !allowedInputTypes.includes((el as HTMLInputElement).type)) ||
        isTag(el, 'select') ||
        isTag(el, 'textarea') ||
        el.getAttribute('contenteditable') === 'true'
    ) {
        return true
    }
    return false
}

/*
 * Check whether a string value should be "captured" or if it may contain sentitive data
 * using a variety of heuristics.
 * @param {string} value - string value to check
 * @returns {boolean} whether the element should be captured
 */
export function shouldCaptureValue(value: string): boolean {
    if (value === null || _isUndefined(value)) {
        return false
    }

    if (typeof value === 'string') {
        value = _trim(value)

        // check to see if input value looks like a credit card number
        // see: https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9781449327453/ch04s20.html
        const ccRegex =
            /^(?:(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11}))$/
        if (ccRegex.test((value || '').replace(/[- ]/g, ''))) {
            return false
        }

        // check to see if input value looks like a social security number
        const ssnRegex = /(^\d{3}-?\d{2}-?\d{4}$)/
        if (ssnRegex.test(value)) {
            return false
        }
    }

    return true
}

/*
 * Check whether an attribute name is an Angular style attr (either _ngcontent or _nghost)
 * These update on each build and lead to noise in the element chain
 * More details on the attributes here: https://angular.io/guide/view-encapsulation
 * @param {string} attributeName - string value to check
 * @returns {boolean} whether the element is an angular tag
 */
export function isAngularStyleAttr(attributeName: string): boolean {
    if (typeof attributeName === 'string') {
        return attributeName.substring(0, 10) === '_ngcontent' || attributeName.substring(0, 7) === '_nghost'
    }
    return false
}

export function loadScript(scriptUrlToLoad: string, callback: (event: Event) => void): void {
    const scriptTag = document.createElement('script')
    scriptTag.type = 'text/javascript'
    scriptTag.src = scriptUrlToLoad
    scriptTag.onload = callback

    const scripts = document.getElementsByTagName('script')
    if (scripts.length > 0) {
        scripts[0].parentNode?.insertBefore(scriptTag, scripts[0])
    } else {
        document.body.appendChild(scriptTag)
    }
}

