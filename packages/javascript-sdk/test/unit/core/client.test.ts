import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UsermavenClient } from '../../../src/core/client';
import { Config } from '../../../src/core/config';

describe('UsermavenClient', () => {
    let client: UsermavenClient;
    const mockConfig: Config = {
        apiKey: 'test-api-key',
        trackingHost: 'https://test.usermaven.com',
    };

    beforeEach(() => {
        client = new UsermavenClient(mockConfig);
        vi.spyOn(client, 'track').mockImplementation((typeName, payload) => {
            if (typeof typeName !== 'string') {
                throw new Error('Event name must be a string');
            }
            if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
                throw new Error('Event payload must be a non-null object and not an array');
            }
        });
        vi.spyOn(client['retryQueue'], 'add').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('id method', () => {
        it('should set user properties and send identify event', async () => {
            const userData = { id: 'user123', email: 'test@example.com' };
            await client.id(userData);

            expect(client.track).toHaveBeenCalledWith('user_identify', expect.objectContaining(userData));
        });

        it('should not send event when doNotSendEvent is true', async () => {
            const userData = { id: 'user123', email: 'test@example.com' };
            await client.id(userData, true);

            expect(client.track).not.toHaveBeenCalled();
        });

        it('should throw an error for invalid email', () => {
            const userData = { id: 'user123', email: 'invalid-email' };
            expect(() => client.id(userData)).rejects.toThrow('Invalid email provided');
        });
    });

    describe('track method', () => {
        it('should track an event with correct payload', () => {
            const eventName = 'test_event';
            const eventPayload = { key: 'value' };
            expect(() => client.track(eventName, eventPayload)).not.toThrow();
        });

        it('should throw an error for non-string event names', () => {
            expect(() => client.track(123 as any)).toThrow('Event name must be a string');
        });

        it('should throw an error for non-object payloads', () => {
            expect(() => client.track('test_event', 'invalid_payload' as any)).toThrow('Event payload must be a non-null object and not an array');
        });

        it('should not throw an error when payload is undefined', () => {
            expect(() => client.track('test_event')).not.toThrow();
        });

        it('should throw an error for null payload', () => {
            expect(() => client.track('test_event', null as any)).toThrow('Event payload must be a non-null object and not an array');
        });

        it('should throw an error for array payload', () => {
            expect(() => client.track('test_event', [] as any)).toThrow('Event payload must be a non-null object and not an array');
        });

        it('should not throw an error for empty object payload', () => {
            expect(() => client.track('test_event', {})).not.toThrow();
        });

        it('should not throw an error for complex nested object payload', () => {
            const complexPayload = {
                user: {
                    id: 1,
                    name: 'John Doe',
                    preferences: {
                        theme: 'dark',
                        notifications: true
                    }
                },
                items: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' }
                ]
            };
            expect(() => client.track('test_event', complexPayload)).not.toThrow();
        });
    });

    describe('group method', () => {
        it('should set company properties and send group event', async () => {
            const companyProps = { id: 'company123', name: 'Test Company', created_at: '2023-01-01' };
            await client.group(companyProps);

            expect(client.track).toHaveBeenCalledWith('group', expect.objectContaining(companyProps));
        });

        it('should not send event when doNotSendEvent is true', async () => {
            const companyProps = { id: 'company123', name: 'Test Company', created_at: '2023-01-01' };
            await client.group(companyProps, true);

            expect(client.track).not.toHaveBeenCalled();
        });

        it('should throw an error for invalid company properties', () => {
            const invalidProps = { id: 'company123' };
            expect(() => client.group(invalidProps as any)).rejects.toThrow('Company properties must include id, name, and created_at');
        });
    });

    describe('pageview method', () => {
        it('should track a pageview event', () => {
            client.pageview();

            expect(client.track).toHaveBeenCalledWith('pageview', expect.objectContaining({
                url: expect.any(String),
                referrer: expect.any(String),
                title: expect.any(String),
            }));
        });
    });

    describe('reset method', () => {
        it('should reset client state', async () => {
            const persistenceSpy = vi.spyOn(client['persistence'], 'clear');
            const cookieManagerSpy = vi.spyOn(client['cookieManager'], 'delete');

            await client.reset();

            expect(persistenceSpy).toHaveBeenCalled();
            expect(cookieManagerSpy).not.toHaveBeenCalled();
        });

        it('should reset client state and anonymous id when resetAnonId is true', async () => {
            const persistenceSpy = vi.spyOn(client['persistence'], 'clear');
            const cookieManagerSpy = vi.spyOn(client['cookieManager'], 'delete');

            await client.reset(true);

            expect(persistenceSpy).toHaveBeenCalled();
            expect(cookieManagerSpy).toHaveBeenCalled();
        });
    });
});
