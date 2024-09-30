import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';

export class BeaconTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payloads: any[]): Promise<void> {
        const url = `${this.trackingHost}/api/v1/event`;
        const blob = new Blob([JSON.stringify(payloads)], { type: 'application/json' });

        if (navigator.sendBeacon(url, blob)) {
            getLogger().debug(`Successfully queued ${payloads.length} event(s) via Beacon API`);
        } else {
            throw new Error("Failed to queue events via Beacon API");
        }
    }
}
