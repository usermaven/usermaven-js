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


/**
 * Checks if the domain is valid for setting cross domain cookies
 * To check we will use Domain Matching technique as mentioned in RFC 6265 - https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.3
 * @param domain
 */
const isValidCrossDomain = (domain: string) => {
    const domain_parts = domain.split('.') // .domain.com => ['', 'domain', 'com']
    const host_parts = window.location.hostname.split('.') // stage.domain.com => ['stage', 'domain', 'com']

    // Check if the domain is a subdomain of the current host
    // If yes, then it is a valid domain for setting cross domain cookies
    const isValid = host_parts.length > domain_parts.length && host_parts.slice(-domain_parts.length).join('.') === domain_parts.filter(Boolean).join('.')
    getLogger().debug("isValidCrossDomain", host_parts.slice(-domain_parts.length).join('.'), domain_parts.filter(Boolean).join('.'), isValid)
    return isValid
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
        } = opt

        let new_cookie_val = `${name}=${encodeURIComponent(val)}`

        if (domain) {
            // https://stackoverflow.com/a/23086139/9783690
            // We will be getting the domain in params as .domain.com, .localhost, etc in all cases,
            // so we need to remove the leading dot before setting the cookie and also check if it is a valid domain
            // for setting cross domain cookies
            const isValid = isValidCrossDomain(domain)
            if (isValid) {
                // Remove the leading dot
                new_cookie_val += `; domain=${domain.replace(/^\./, '')}`
            }
        }

        if (path) {
            new_cookie_val += `; path=${path}`
        } else {
            new_cookie_val += `; path=/`
        }

        if (expires) {
            new_cookie_val += `; expires=${expires.toUTCString()}`
        }

        if (maxAge) {
            new_cookie_val += `; max-age=${maxAge}`
        }

        if (httpOnly) {
            new_cookie_val += `; httponly`
        }

        if (secure) {
            new_cookie_val += `; secure`
        }

        if (sameSite) {
            const sameSiteAttr = typeof sameSite === "string"
                ? sameSite.toLowerCase()
                : sameSite;

            switch (sameSiteAttr) {
                case true:
                    new_cookie_val += "; SameSite=Strict";
                    break;
                case "lax":
                    new_cookie_val += "; SameSite=Lax";
                    break;
                case "strict":
                    new_cookie_val += "; SameSite=Strict";
                    break;
                case "none":
                    new_cookie_val += "; SameSite=None";
                    break;
            }
        }

        return new_cookie_val

    } catch (e) {
        getLogger().error("serializeCookie", e);

        return ''
    }
}
