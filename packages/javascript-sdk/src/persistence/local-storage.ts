export class LocalStoragePersistence {
    private storage: Record<string, any> = {};
    private prefix: string;

    constructor(apiKey: string) {
        this.prefix = `usermaven_${apiKey}_`;
        this.load();
    }

    set(key: string, value: any): void {
        this.storage[key] = value;
        this.save();
    }

    get(key: string): any {
        return this.storage[key];
    }

    remove(key: string): void {
        delete this.storage[key];
        this.save();
    }

    clear(): void {
        this.storage = {};
        this.save();
    }

    private save(): void {
        try {
            localStorage.setItem(this.prefix + 'data', JSON.stringify(this.storage));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private load(): void {
        try {
            const data = localStorage.getItem(this.prefix + 'data');
            if (data) {
                this.storage = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
}
