import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';

export class FetchTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        const url = this.buildUrl(payload.api_key);
        const jsonPayload = JSON.stringify(payload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: jsonPayload,
                keepalive: true,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseBody = await response.json();
            this.handleResponse(response.status, responseBody);

            getLogger().debug(`Successfully sent data to ${url}`);
        } catch (error) {
            getLogger().error(`Failed to send data to ${url}: ${error.message}`, jsonPayload, error);
            throw error; // Rethrow the error to trigger retry mechanism
        }
    }

    private buildUrl(apiKey: string): string {
        let urlPrefix = "/api/v1/event";
        let url = `${this.trackingHost}${urlPrefix}?token=${apiKey}`;
        return url;
    }

    private handleResponse(status: number, responseBody: any): void {
        // Handle any specific response logic here
        // This can be expanded based on the requirements from the old implementation
        if (status === 200) {
            // Handle successful response
        } else {
            getLogger().warn(`Unexpected response status: ${status}`);
        }
    }
}
