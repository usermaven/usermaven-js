export class CookieManager {
    private cookieDomain: string;

    constructor(private domain?: string) {
        this.cookieDomain = this.getCookieDomain();
    }

    set(name: string, value: string, expirationDays: number = 365, secure: boolean = true, httpOnly: boolean = false): void {
        const date = new Date();
        date.setTime(date.getTime() + expirationDays * 24 * 60 * 60 * 1000);
        const expires = `expires=${date.toUTCString()}`;
        const secureFlag = secure ? '; Secure' : '';
        const httpOnlyFlag = httpOnly ? '; HttpOnly' : '';
        document.cookie = `${name}=${value};${expires};path=/;domain=${this.cookieDomain}${secureFlag}${httpOnlyFlag}`;
    }

    get(name: string): string | null {
        const cookieName = `${name}=`;
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length);
            }
        }
        return null;
    }

    delete(name: string): void {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;domain=${this.cookieDomain}`;
    }

    private getCookieDomain(): string {
        if (typeof window === 'undefined' || this.domain) {
            return this.domain || '';
        }
        return '.' + this.extractRoot(window.location.hostname);
    }

    private extractRoot(url: string): string {
        const domainParts = url.split(".");
        const domainLength = domainParts.length;

        // Check if it's an IP address
        if (domainLength === 4 && domainParts.every(part => !isNaN(Number(part)))) {
            return url;
        }

        let rootDomain = this.extractTopLevelDomain(url);
        if (!rootDomain) { // If it's not a top level domain, use a fallback method
            rootDomain = this.extractRootDomain(url);
        }

        return rootDomain;
    }

    private extractTopLevelDomain(url: string): string {
        const DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]+\.[a-z.]{2,6}$/i;
        const matches = url.match(DOMAIN_MATCH_REGEX);
        return matches ? matches[0] : '';
    }

    private extractRootDomain(url: string): string {
        let domain = this.extractHostname(url);
        const splitArr = domain.split('.');
        const arrLen = splitArr.length;

        // extracting the root domain here
        // if there is a subdomain
        if (arrLen > 2) {
            if (splitArr[arrLen - 1].length == 2) {
                // likely a ccTLD
                domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
                // if the second level domain is also two letters (like co.uk), include the next part up
                if (splitArr[arrLen - 2].length == 2) {
                    domain = splitArr[arrLen - 3] + '.' + domain;
                }
            } else {
                // likely a gTLD
                domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
            }
        }
        return domain;
    }

    private extractHostname(url: string): string {
        let hostname: string;
        //find & remove protocol (http, ftp, etc.) and get hostname

        if (url.indexOf("//") > -1) {
            hostname = url.split('/')[2];
        } else {
            hostname = url.split('/')[0];
        }

        //find & remove port number
        hostname = hostname.split(':')[0];
        //find & remove "?"
        hostname = hostname.split('?')[0];

        return hostname;
    }
}
