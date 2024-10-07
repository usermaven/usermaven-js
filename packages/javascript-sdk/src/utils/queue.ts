import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';
import { LocalStoragePersistence } from '../persistence/local-storage';

export class RetryQueue {
    private queue: QueueItem[] = [];
    private processing: boolean = false;
    private batchTimeoutId: number | null = null;
    private persistence: LocalStoragePersistence;
    private isOnline: boolean = navigator.onLine;

    constructor(
        private transport: Transport,
        private maxRetries: number = 3,
        private retryInterval: number = 1000,
        private batchSize: number = 10,
        private batchInterval: number = 1000
    ) {
        this.persistence = new LocalStoragePersistence('offline_queue');
        this.loadQueueFromStorage();
        this.initNetworkListeners();
        this.scheduleBatch();
    }

    add(payload: any): void {
        const item = { payload, retries: 0, timestamp: Date.now() };
        this.queue.push(item);
        this.saveQueueToStorage();
    }

    private initNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processBatch();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    private scheduleBatch(): void {
        if (this.batchTimeoutId !== null) {
            clearTimeout(this.batchTimeoutId);
        }

        this.batchTimeoutId = window.setTimeout(() => this.processBatch(), this.batchInterval);
    }

    private async processBatch(): Promise<void> {
        if (!this.isOnline || this.processing || this.queue.length === 0) {
            this.scheduleBatch();
            return;
        }

        this.processing = true;
        const batch = this.queue.splice(0, this.batchSize);
        const payloads = batch.map(item => item.payload);

        try {
            await this.transport.send(payloads);
            getLogger().debug(`Successfully sent batch of ${batch.length} payloads`);
            this.saveQueueToStorage();
        } catch (error) {
            getLogger().error('Failed to send batch', error);
            await this.handleBatchFailure(batch);
        }

        this.processing = false;
        this.scheduleBatch();
    }

    private async handleBatchFailure(batch: QueueItem[]): Promise<void> {
        for (const item of batch) {
            if (item.retries < this.maxRetries) {
                item.retries++;
                this.queue.unshift(item);
                getLogger().warn(`Retry attempt ${item.retries} for payload`);
            } else {
                getLogger().error('Max retries reached, discarding payload', item.payload);
            }
        }

        this.saveQueueToStorage();
        await new Promise(resolve => setTimeout(resolve, this.retryInterval));
    }

    private loadQueueFromStorage(): void {
        const storedQueue = this.persistence.get('queue');
        if (storedQueue) {
            this.queue = JSON.parse(storedQueue);
        }
    }

    private saveQueueToStorage(): void {
        this.persistence.set('queue', JSON.stringify(this.queue));
    }
}

interface QueueItem {
    payload: any;
    retries: number;
    timestamp: number;
}
