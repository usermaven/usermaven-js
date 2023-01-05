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

// Note: updated this method to test on staging (Ref:: https://github.com/PostHog/posthog-js/blob/master/src/storage.ts#L42)
export function serializeCookie(name, val, opt: CookieOpts = {}) {
  const {
    crossSubdomain,
    expires: date,
    secure: isSecure,
    domain
  } = opt;

  try {
    let cdomain = '',
      expires = '',
      secure = ''

    if (crossSubdomain) {
      const matches = document.location.hostname.match(DOMAIN_MATCH_REGEX),
        domain = matches ? matches[0] : ''

      cdomain = domain ? '; domain=.' + domain : ''
    } else {
      if (domain) {
        cdomain = '; domain=' + domain
      }
    }

    if (date) {
      expires = '; expires=' + date.toUTCString()
    }

    if (isSecure) {
      secure = '; secure'
    }

    const new_cookie_val =
      name + '=' + encodeURIComponent(JSON.stringify(val)) + expires + '; path=/' + cdomain + secure
    document.cookie = new_cookie_val
    return new_cookie_val
  } catch (err) {
    return
  }
}
