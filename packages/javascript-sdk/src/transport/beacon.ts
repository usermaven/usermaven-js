import { Transport } from '../core/types';

export class BeaconTransport implements Transport {
    constructor(private trackingHost: string) {}

    async send(payload: any): Promise<void> {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(`${this.trackingHost}/collect`, blob);
    }
}
