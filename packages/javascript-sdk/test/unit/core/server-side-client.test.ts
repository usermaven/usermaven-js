import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UsermavenClient } from '../../../src/core/client';
import { Config } from '../../../src/core/config';
import * as commonUtils from '../../../src/utils/common';
import * as helpers from '../../../src/utils/helpers';

describe('UsermavenClient (Server-side)', () => {
    let client: UsermavenClient;
    let trackSpy: ReturnType<typeof vi.fn>;
    let trackInternalSpy: ReturnType<typeof vi.fn>;
    const mockConfig: Config = {
        key: 'test-api-key',
        trackingHost: 'https://test.usermaven.com',
    };

    beforeEach(() => {
        vi.spyOn(commonUtils, 'isWindowAvailable').mockReturnValue(false);
        vi.spyOn(helpers, 'generateId').mockReturnValue('mocked-id');

        // Create spies for both track and trackInternal methods
        trackSpy = vi.fn();
        trackInternalSpy = vi.fn();

        // Create the client instance
        client = new UsermavenClient(mockConfig);

        // Replace both track and trackInternal methods with our spies
        client.track = trackSpy;
        (client as any).trackInternal = trackInternalSpy;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize without browser-specific features', () => {
        expect(client['autoCapture']).toBeUndefined();
        expect(client['formTracking']).toBeUndefined();
        expect(client['pageviewTracking']).toBeUndefined();
        expect(client['rageClick']).toBeUndefined();
        expect(client['cookieManager']).toBeUndefined();
    });

    it('should use HttpsTransport on server-side', () => {
        expect(client['transport'].constructor.name).toBe('HttpsTransport');
    });

    it('should track events on server-side', () => {
        const eventName = 'server_event';
        const eventPayload = { key: 'value' };
        client.track(eventName, eventPayload);
        expect(trackSpy).toHaveBeenCalledWith(eventName, eventPayload);
    });


    it('should identify users on server-side', async () => {
        const userData = { id: 'server_user_123', email: 'server@example.com' };
        await client.id(userData);
        expect(trackInternalSpy).toHaveBeenCalledWith('user_identify', expect.objectContaining({
            ...userData,
            anonymous_id: 'mocked-id'
        }));
    });

    it('should handle group method on server-side', async () => {
        const companyProps = { id: 'server_company_123', name: 'Server Company', created_at: '2023-01-01' };
        await client.group(companyProps);
        expect(trackSpy).toHaveBeenCalledWith('group', expect.objectContaining(companyProps));
    });

    it('should not throw error for pageview method on server-side', () => {
        expect(() => client.pageview()).not.toThrow();
        expect(trackSpy).not.toHaveBeenCalled();
    });

    it('should reset client state on server-side', async () => {
        const persistenceSpy = vi.spyOn(client['persistence'], 'clear');
        await client.reset();
        expect(persistenceSpy).toHaveBeenCalled();
    });

    it('should generate a new anonymous ID on server-side', () => {
        expect(client['anonymousId']).toBe('mocked-id');
        expect(helpers.generateId).toHaveBeenCalled();
    });

    it('should handle complex nested object payload', () => {
        const complexPayload = {
            user: {
                id: 1,
                name: 'John Doe',
                custom: {
                    theme: 'dark',
                    notifications: true
                }
            }
        };
        expect(() => client.track('complex_event', complexPayload)).not.toThrow();
        expect(trackSpy).toHaveBeenCalledWith('complex_event', complexPayload);
    });

    it('should throw an error for invalid company properties', () => {
        const invalidProps = { id: 'company123' };
        expect(() => client.group(invalidProps as any)).rejects.toThrow('Company properties must include id, name, and created_at');
    });
});
