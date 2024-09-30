
import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';

export class FetchTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payloads: any[]): Promise<void> {
        const url = `${this.trackingHost}/api/v1/event`;
        const body = JSON.stringify(payloads);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        getLogger().debug(`Successfully sent ${payloads.length} event(s)`);
    }
}
