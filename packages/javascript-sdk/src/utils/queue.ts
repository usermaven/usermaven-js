import { Transport } from '../core/types';
import {getLogger, Logger} from '../utils/logger';
import { LocalStoragePersistence } from '../persistence/local-storage';
import { isWindowAvailable } from '../utils/common';

export class RetryQueue {
    private queue: QueueItem[] = [];
    private processing: boolean = false;
    private batchTimeoutId: number | null = null;
    private persistence: LocalStoragePersistence;
    private isOnline: boolean = true; // Default to true for server-side

    constructor(
        private transport: Transport,
        private maxRetries: number = 3,
        private retryInterval: number = 1000,
        private batchSize: number = 10,
        private batchInterval: number = 1000,
        private logger: Logger = getLogger()
    ) {
        this.persistence = new LocalStoragePersistence('offline_queue');
        if (isWindowAvailable()) {
            this.isOnline = navigator.onLine;
            this.loadQueueFromStorage();
            this.initNetworkListeners();
            this.scheduleBatch();
        }
    }

    add(payload: any): void {
        const item = { payload, retries: 0, timestamp: Date.now() };
        this.queue.push(item);
        if (isWindowAvailable()) {
            this.saveQueueToStorage();
        } else {
            this.processBatch(); // Immediately process on server-side
        }
    }

    private initNetworkListeners(): void {
        if (isWindowAvailable()) {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.processBatch();
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });
        }
    }

    private scheduleBatch(): void {
        if (!isWindowAvailable()) return;

        if (this.batchTimeoutId !== null) {
            clearTimeout(this.batchTimeoutId);
        }

        this.batchTimeoutId = window.setTimeout(() => this.processBatch(), this.batchInterval);
    }

    private async processBatch(): Promise<void> {
        if ((!isWindowAvailable() || this.isOnline) && !this.processing && this.queue.length > 0) {
            this.processing = true;
            const batch = this.queue.splice(0, this.batchSize);
            const payloads = batch.map(item => item.payload);

            try {
                await this.transport.send(payloads);
                this.logger.debug(`Successfully sent batch of ${batch.length} payloads`);
                if (isWindowAvailable()) {
                    this.saveQueueToStorage();
                }
            } catch (error) {
                 this.logger.error('Failed to send batch', error);
                await this.handleBatchFailure(batch);
            }

            this.processing = false;
        }

        if (isWindowAvailable()) {
            this.scheduleBatch();
        }
    }

    private async handleBatchFailure(batch: QueueItem[]): Promise<void> {
        for (const item of batch) {
            if (item.retries < this.maxRetries) {
                item.retries++;
                this.queue.unshift(item);
                 this.logger.warn(`Retry attempt ${item.retries} for payload`);
            } else {
                 this.logger.error('Max retries reached, discarding payload', item.payload);
            }
        }

        if (isWindowAvailable()) {
            this.saveQueueToStorage();
            await new Promise(resolve => setTimeout(resolve, this.retryInterval));
        }
    }

    private loadQueueFromStorage(): void {
        if (isWindowAvailable()) {
            const storedQueue = this.persistence.get('queue');
            if (storedQueue) {
                this.queue = JSON.parse(storedQueue);
            }
        }
    }

    private saveQueueToStorage(): void {
        if (isWindowAvailable()) {
            this.persistence.set('queue', JSON.stringify(this.queue));
        }
    }
}

interface QueueItem {
    payload: any;
    retries: number;
    timestamp: number;
}
