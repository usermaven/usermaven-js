import {getLogger} from "./log";

export type CookieOpts = {
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None" | true;
    crossSubdomain?: boolean;
};
const DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]+\.[a-z.]{2,6}$/i

const getCrossSubdomain = () => {
    const matches = document.location.hostname.match(DOMAIN_MATCH_REGEX)

    const domain = matches ? matches[0] : ''

    return domain ? `.${domain}` : ''
}

// Note: updated this method to test on staging (Ref:: https://github.com/PostHog/posthog-js/blob/master/src/storage.ts#L42)
// Commented out some jitsu cookies setters that are not bring used in posthog-js
export function serializeCookie(name, val, opt: CookieOpts = {}) {
    try {
        const {
            maxAge,
            domain,
            path,
            expires,
            httpOnly,
            secure,
            sameSite,
            crossSubdomain,
        } = opt

        let new_cookie_val = `${name}=${encodeURIComponent(val)}`

        if (crossSubdomain) {
            const cross_subdomain = getCrossSubdomain()
            new_cookie_val += `; domain=${cross_subdomain}`
        }
        // Commented this out as this is causing issue with setting cookies with domain param
        // else if (domain) {
        //     new_cookie_val += `; domain=${domain}`
        // }

        if (path) {
            new_cookie_val += `; path=${path}`
        } else {
            new_cookie_val += `; path=/`
        }

        if (expires) {
            new_cookie_val += `; expires=${expires.toUTCString()}`
        }

        // if (maxAge) {
        //     new_cookie_val += `; max-age=${maxAge}`
        // }

        // if (httpOnly) {
        //     new_cookie_val += `; httponly`
        // }

        if (secure) {
            new_cookie_val += `; secure`
        }

        // if (sameSite) {
        //     new_cookie_val += `; samesite=${sameSite}`
        // }

        return new_cookie_val

    } catch (e) {
        getLogger().error("serializeCookie", e);

        return ''
    }
}
