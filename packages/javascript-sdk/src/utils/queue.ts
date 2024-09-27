// src/utils/queue.ts

import { getLogger } from './logger';
import { Transport } from '../core/types';

export class RetryQueue {
    private queue: QueueItem[] = [];
    private processing: boolean = false;

    constructor(
        private transport: Transport,
        private maxRetries: number = 3,
        private retryInterval: number = 1000
    ) {}

    add(payload: any): void {
        this.queue.push({ payload, retries: 0 });
        if (!this.processing) {
            this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const item = this.queue[0];

        try {
            await this.transport.send(item.payload);
            this.queue.shift(); // Remove the first item if successful
            getLogger().debug('Successfully sent payload');
        } catch (error) {
            if (item.retries < this.maxRetries) {
                item.retries++;
                getLogger().warn(`Retry attempt ${item.retries} for payload`);
                await this.wait(this.retryInterval);
            } else {
                getLogger().error('Max retries reached, discarding payload', item.payload);
                this.queue.shift(); // Remove the item if max retries reached
            }
        }

        // Process next item in the queue
        this.processQueue();
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

interface QueueItem {
    payload: any;
    retries: number;
}
