import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryQueue } from '../../../src/utils/queue';
import { Transport } from '../../../src/core/types';
import { LocalStoragePersistence } from '../../../src/persistence/local-storage';
import * as commonUtils from '../../../src/utils/common';

// Mock dependencies
vi.mock('../../../src/core/types');
vi.mock('../../../src/utils/logger', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    }),
}));
vi.mock('../../../src/persistence/local-storage');
vi.mock('../../../src/utils/common');

describe('RetryQueue', () => {
    let retryQueue: RetryQueue;
    let mockTransport: jest.Mocked<Transport>;
    let mockPersistence: jest.Mocked<LocalStoragePersistence>;

    beforeEach(() => {
        vi.useFakeTimers();
        mockTransport = { send: vi.fn().mockResolvedValue(undefined) } as any;
        mockPersistence = {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
            clear: vi.fn(),
        } as any;
        vi.mocked(LocalStoragePersistence).mockImplementation(() => mockPersistence);
        vi.mocked(commonUtils.isWindowAvailable).mockReturnValue(true);

        retryQueue = new RetryQueue(mockTransport);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('should add items to the queue', () => {
        const payload = { data: 'test' };
        retryQueue.add(payload);
        expect(mockPersistence.set).toHaveBeenCalledWith('queue', expect.any(String));
    });

    it('should process batch when online', async () => {
        const payload1 = { data: 'test1' };
        const payload2 = { data: 'test2' };
        retryQueue.add(payload1);
        retryQueue.add(payload2);

        await vi.runOnlyPendingTimersAsync();
        await vi.runOnlyPendingTimersAsync(); // Run twice to ensure the batch is processed

        expect(mockTransport.send).toHaveBeenCalledWith([payload1, payload2]);
    });

    it('should retry failed batches', async () => {
        const payload = { data: 'test' };
        retryQueue.add(payload);

        mockTransport.send.mockRejectedValueOnce(new Error('Network error'));
        mockTransport.send.mockResolvedValueOnce(undefined);

        await vi.runOnlyPendingTimersAsync();
        await vi.advanceTimersByTimeAsync(retryQueue['retryInterval']);
        await vi.runOnlyPendingTimersAsync();

        expect(mockTransport.send).toHaveBeenCalledTimes(2);
    });

    it('should discard items after max retries', async () => {
        const payload = { data: 'test' };
        retryQueue.add(payload);

        mockTransport.send.mockRejectedValue(new Error('Network error'));

        for (let i = 0; i <= retryQueue['maxRetries']; i++) {
            await vi.runOnlyPendingTimersAsync();
            await vi.advanceTimersByTimeAsync(retryQueue['retryInterval']);
        }

        expect(mockTransport.send).toHaveBeenCalledTimes(retryQueue['maxRetries'] + 1); // Initial + maxRetries
    });

    it('should load queue from storage on initialization', () => {
        const storedQueue = JSON.stringify([{ payload: { data: 'stored' }, retries: 0, timestamp: Date.now() }]);
        mockPersistence.get.mockReturnValueOnce(storedQueue);

        new RetryQueue(mockTransport);

        expect(mockPersistence.get).toHaveBeenCalledWith('queue');
    });

    it('should handle offline/online transitions', async () => {
        const payload = { data: 'test' };
        retryQueue.add(payload);

        // Simulate going offline
        window.dispatchEvent(new Event('offline'));
        await vi.runOnlyPendingTimersAsync();
        expect(mockTransport.send).not.toHaveBeenCalled();

        // Simulate going back online
        window.dispatchEvent(new Event('online'));
        await vi.runOnlyPendingTimersAsync();

        expect(mockTransport.send).toHaveBeenCalledWith([payload]);
    });
});
