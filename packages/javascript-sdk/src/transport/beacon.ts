import { Transport } from './transport';
import { getLogger } from '../utils/logger';

export class BeaconTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        const url = `${this.trackingHost}/api/v1/event`;
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

        if (navigator.sendBeacon(url, blob)) {
            getLogger().debug("Beacon sent successfully");
        } else {
            throw new Error("Failed to send beacon");
        }
    }
}
