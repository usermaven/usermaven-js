import { Transport } from './transport';
import { getLogger } from '../utils/logger';

export class FetchTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        const url = `${this.trackingHost}/api/v1/event`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        getLogger().debug("Fetch request sent successfully");
    }
}
