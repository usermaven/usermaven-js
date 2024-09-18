import { Transport } from '../core/types';

export class FetchTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        try {
            const response = await fetch(`${this.trackingHost}/collect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending data:', error);
        }
    }
}
