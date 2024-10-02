export class CookieManager {
    constructor(private domain?: string) {
        if (!this.domain) {
            this.domain = window.location.hostname;
        }
    }

    set(name: string, value: string, expirationDays: number = 365, secure: boolean = true, httpOnly: boolean = false): void {
        const date = new Date();
        date.setTime(date.getTime() + expirationDays * 24 * 60 * 60 * 1000);
        const expires = `expires=${date.toUTCString()}`;
        const secureFlag = secure ? '; Secure' : '';
        const httpOnlyFlag = httpOnly ? '; HttpOnly' : '';
        document.cookie = `${name}=${value};${expires};path=/;domain=${this.domain}${secureFlag}${httpOnlyFlag}`;
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
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;domain=${this.domain}`;
    }
}
