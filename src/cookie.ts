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
            new_cookie_val += `; domain=${domain}`
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
        } else if (secure) {
            /**
             * SameSite=None - means that the browser sends the cookie with both cross-site and same-site requests.
             * The Secure attribute must also be set when setting this value, like so SameSite=None; Secure.
             * If Secure is missing an error will be logged.
             *
             * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value
             */
            new_cookie_val += "; SameSite=None";
        }

        return new_cookie_val

    } catch (e) {
        getLogger().error("serializeCookie", e);

        return ''
    }
}
