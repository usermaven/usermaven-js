import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';

export class XhrTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = this.buildUrl(payload.api_key);
            const jsonPayload = JSON.stringify(payload);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.handleResponse(xhr.status, xhr.responseText);
                    getLogger().debug(`Successfully sent data to ${url}`);
                    resolve();
                } else {
                    getLogger().warn(
                        `Failed to send data to ${url} (#${xhr.status} - ${xhr.statusText})`,
                        jsonPayload
                    );
                    reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                getLogger().error(`Failed to send payload to ${url}: Network error`, jsonPayload);
                reject(new Error('Network error'));
            };

            xhr.send(jsonPayload);
            getLogger().debug("Sending json", jsonPayload);
        });
    }

    private buildUrl(apiKey: string): string {
        let urlPrefix = "/api/v1/event";
        let url = `${this.trackingHost}${urlPrefix}?token=${apiKey}`;
        return url;
    }

    private handleResponse(status: number, responseText: string): void {
        // Handle any specific response logic here
        // This can be expanded based on the requirements from the old implementation
        if (status === 200) {
            try {
                const responseData = JSON.parse(responseText);
                // Handle successful response
            } catch (e) {
                getLogger().error(`Failed to parse response: ${responseText}`, e);
            }
        } else {
            getLogger().warn(`Unexpected response status: ${status}`);
        }
    }
}
