// src/utils/queue.ts

import { getLogger } from './logger';
import { Transport } from '../core/types';

export class RetryQueue {
    private queue: QueueItem[] = [];
    private processing: boolean = false;
    private batchSize: number;
    private batchInterval: number;
    private batchTimeoutId: number | null = null;

    constructor(
        private transport: Transport,
        private maxRetries: number = 3,
        private retryInterval: number = 1000,
        batchSize: number = 10,
        batchInterval: number = 5000
    ) {
        this.batchSize = Math.max(1, batchSize);
        this.batchInterval = Math.max(1000, batchInterval);
    }

    add(payload: any): void {
        this.queue.push({ payload, retries: 0 });
        this.scheduleBatch();
    }

    private scheduleBatch(): void {
        if (this.batchTimeoutId !== null) {
            clearTimeout(this.batchTimeoutId);
        }

        if (this.queue.length >= this.batchSize) {
            this.processBatch();
        } else {
            this.batchTimeoutId = window.setTimeout(() => this.processBatch(), this.batchInterval);
        }
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const batch = this.queue.slice(0, this.batchSize);
        const payloads = batch.map(item => item.payload);

        try {
            await this.transport.send(payloads);
            this.queue.splice(0, batch.length);
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
                getLogger().warn(`Retry attempt ${item.retries} for payload`);
            } else {
                getLogger().error('Max retries reached, discarding payload', item.payload);
                const index = this.queue.indexOf(item);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                }
            }
        }

        await this.wait(this.retryInterval);
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

interface QueueItem {
    payload: any;
    retries: number;
}
