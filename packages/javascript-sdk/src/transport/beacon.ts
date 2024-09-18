import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';

export class BeaconTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        const url = this.buildUrl(payload.api_key);
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

        getLogger().debug("Sending beacon", JSON.stringify(payload));

        if (navigator.sendBeacon(url, blob)) {
            getLogger().debug("Beacon sent successfully");
        } else {
            getLogger().error("Failed to send beacon");
            throw new Error("Failed to send beacon");
        }
    }

    private buildUrl(apiKey: string): string {
        let urlPrefix = "/api/v1/event";
        let url = `${this.trackingHost}${urlPrefix}?token=${apiKey}`;
        return url;
    }
}
