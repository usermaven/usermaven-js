export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function isValidEmail(email: string): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

export function debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function getUtmParams(): Record<string, string> {
    const utmParams: Record<string, string> = {};
    const queryParams = parseQueryString(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    utmKeys.forEach(key => {
        if (queryParams[key]) {
            utmParams[key.replace('utm_', '')] = queryParams[key];
        }
    });

    return utmParams;
}

export function parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    const queries = queryString.substring(1).split('&');

    for (let i = 0; i < queries.length; i++) {
        const pair = queries[i].split('=');
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }

    return params;
}

export function isString(value: any): boolean {
    return typeof value === 'string' || value instanceof String;
}

export function isObject(value: any): boolean {
    return value && typeof value === 'object' && value.constructor === Object;
}
