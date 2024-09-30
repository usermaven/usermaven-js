// src/utils/queue.ts

import { getLogger } from '../utils/logger';
import { Transport } from '../core/types';

export class RetryQueue {
    private queue: QueueItem[] = [];
    private processing: boolean = false;
    private batchTimeoutId: number | null = null;

    constructor(
        private transport: Transport,
        private maxRetries: number = 3,
        private retryInterval: number = 1000,
        private batchSize: number = 10,
        private batchInterval: number = 1000
    ) {
        this.scheduleBatch();
    }

    add(payload: any): void {
        this.queue.push({ payload, retries: 0 });
    }

    private scheduleBatch(): void {
        if (this.batchTimeoutId !== null) {
            clearTimeout(this.batchTimeoutId);
        }

        this.batchTimeoutId = window.setTimeout(() => this.processBatch(), this.batchInterval);
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            this.scheduleBatch();
            return;
        }

        this.processing = true;
        const batch = this.queue.splice(0, this.batchSize);
        const payloads = batch.map(item => item.payload);

        try {
            await this.transport.send(payloads);
            getLogger().debug(`Successfully sent batch of ${batch.length} payloads`);
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

        await new Promise(resolve => setTimeout(resolve, this.retryInterval));
    }
}

interface QueueItem {
    payload: any;
    retries: number;
}
