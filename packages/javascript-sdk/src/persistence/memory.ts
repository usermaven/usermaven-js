export class MemoryPersistence {
    private storage: Map<string, any> = new Map();

    set(key: string, value: any): void {
        this.storage.set(key, value);
    }

    get(key: string): any {
        return this.storage.get(key);
    }

    remove(key: string): void {
        this.storage.delete(key);
    }

    clear(): void {
        this.storage.clear();
    }
}
