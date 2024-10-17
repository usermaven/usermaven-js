export class CookieManager {
    private cookieDomain: string;

    constructor(private domain?: string) {
        this.cookieDomain = this.getCookieDomain();
        console.log(this.cookieDomain);
    }

    set(name: string, value: string, expirationDays: number = 365, secure: boolean = true, httpOnly: boolean = false): void {
        console.log('Setting cookie', name, value, expirationDays, secure, httpOnly);
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
        return this.extractRoot(window.location.hostname);
    }

    private extractRoot(url: string): string {
        const domainParts = url.split(".");
        const domainLength = domainParts.length;

        // Check if it's an IP address
        if (domainLength === 4 && domainParts.every(part => !isNaN(Number(part)))) {
            return url;
        }

        // Handle localhost
        if (url === 'localhost') {
            return "." + url;
        }

        // Handle subdomains
        if (domainLength > 2) {
            // Check for country code top-level domains (ccTLDs)
            const knownCcTLDs = ['co.uk', 'com.au', 'co.jp']; // Add more as needed
            const lastTwoParts = domainParts.slice(-2).join('.');
            if (knownCcTLDs.includes(lastTwoParts)) {
                return '.' + domainParts.slice(-3).join('.');
            }
            return '.' + domainParts.slice(-2).join('.');
        }

        // Handle simple domains
        return '.' + url;
    }
}
