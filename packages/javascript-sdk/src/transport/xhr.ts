import { Transport } from './transport';
import { getLogger } from '../utils/logger';

export class XhrTransport implements Transport {
    constructor(private trackingHost: string) {}

    send(payload: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.trackingHost}/api/v1/event`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    getLogger().debug("XHR request sent successfully");
                    resolve();
                } else {
                    reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error'));
            };

            xhr.send(JSON.stringify(payload));
        });
    }
}
