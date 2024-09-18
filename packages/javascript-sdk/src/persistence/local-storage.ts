export class LocalStoragePersistence {
    private prefix: string;

    constructor(apiKey: string) {
        this.prefix = `usermaven_${apiKey}_`;
    }

    set(key: string, value: any): void {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    get(key: string): any {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Error retrieving from localStorage:', error);
            return null;
        }
    }

    remove(key: string): void {
        localStorage.removeItem(this.prefix + key);
    }

    clear(): void {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
    }
}
