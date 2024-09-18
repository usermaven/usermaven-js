import { Config } from './config';
import { UserProps, EventPayload, Transport } from './types';
import { Logger } from '../utils/logger';
import { CookieManager } from '../utils/cookie';
import { AutoCapture } from '../tracking/autocapture';
import { FormTracking } from '../tracking/form-tracking';
import { PageviewTracking } from '../tracking/pageviews';
import { BeaconTransport } from '../transport/beacon';
import { FetchTransport } from '../transport/fetch';
import { XhrTransport } from '../transport/xhr';
import { LocalStoragePersistence } from '../persistence/local-storage';
import { MemoryPersistence } from '../persistence/memory';
import { generateId } from '../utils/helpers';

export class UsermavenClient {
    private config: Config;
    private logger: Logger;
    private cookieManager: CookieManager;
    private transport: Transport;
    private persistence: LocalStoragePersistence | MemoryPersistence;
    private autoCapture?: AutoCapture;
    private formTracking?: FormTracking;
    private pageviewTracking?: PageviewTracking;

    constructor(config: Config) {
        this.config = config;
        this.logger = new Logger(config.logLevel);
        this.cookieManager = new CookieManager(config.cookieDomain, config.cookieName);
        this.transport = this.initializeTransport();
        this.persistence = this.initializePersistence();

        if (config.autocapture) {
            this.autoCapture = new AutoCapture(this);
        }

        if (config.formTracking) {
            this.formTracking = new FormTracking(this);
        }

        if (config.autoPageview) {
            this.pageviewTracking = new PageviewTracking(this);
        }
    }

    private initializeTransport(): Transport {
        if (this.config.useBeaconApi && navigator.sendBeacon) {
            return new BeaconTransport(this.config.trackingHost);
        } else if (this.config.forceUseFetch || !window.XMLHttpRequest) {
            return new FetchTransport(this.config.trackingHost);
        } else {
            return new XhrTransport(this.config.trackingHost);
        }
    }

    private initializePersistence(): LocalStoragePersistence | MemoryPersistence {
        if (this.config.disableEventPersistence) {
            return new MemoryPersistence();
        } else {
            return new LocalStoragePersistence(this.config.apiKey);
        }
    }

    public identify(userProps: UserProps): void {
        const userId = userProps.id || generateId();
        this.persistence.set('userId', userId);
        this.persistence.set('userProps', userProps);
        this.track('identify', userProps);
    }

    public track(eventName: string, eventProps?: EventPayload): void {
        const payload = {
            event: eventName,
            properties: eventProps,
            userId: this.persistence.get('userId'),
            timestamp: new Date().toISOString(),
        };
        this.transport.send(payload);
    }

    public pageview(): void {
        this.track('pageview', {
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
        });
    }

    public getConfig(): Config {
        return this.config;
    }

    public getLogger(): Logger {
        return this.logger;
    }
}
