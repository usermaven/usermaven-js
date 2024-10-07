import { describe, it, expect } from 'vitest';
import { UsermavenClient } from '../../src/core/client';

describe('UsermavenClient', () => {
    it('should initialize with correct config', () => {
        const client = new UsermavenClient({
            apiKey: 'test-api-key',
            trackingHost: 'https://test.usermaven.com',
        });

        expect(client).toBeDefined();
        expect(client.getConfig().apiKey).toBe('test-api-key');
        expect(client.getConfig().trackingHost).toBe('https://test.usermaven.com');
    });
});
