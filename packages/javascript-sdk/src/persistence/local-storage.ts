import { getLogger, Logger } from '../utils/logger';
import { isWindowAvailable } from '../utils/common';

export class LocalStoragePersistence {
  private storage: Record<string, any> = {};
  private prefix: string;
  private logger: Logger;

  constructor(apiKey: string, logger?: Logger) {
    this.prefix = `usermaven_${apiKey}_`;
    this.load();
    this.logger = logger || getLogger();
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

  save(): void {
    if (!isWindowAvailable()) {
      this.logger.warn('localStorage is not available in this environment');
      return;
    }
    try {
      localStorage.setItem(this.prefix + 'data', JSON.stringify(this.storage));
    } catch (error) {
      this.logger.error('Error saving to localStorage:', error);
    }
  }

  private load(): void {
    if (!isWindowAvailable()) {
      this.logger.warn('localStorage is not available in this environment');
      return;
    }
    try {
      const data = localStorage.getItem(this.prefix + 'data');
      if (data) {
        this.storage = JSON.parse(data);
      }
    } catch (error) {
      this.logger.error('Error loading from localStorage:', error);
    }
  }
}
