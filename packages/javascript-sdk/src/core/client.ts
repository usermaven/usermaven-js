
import { Config } from './config';
import {UserProps, EventPayload, Transport, CompanyProps, Policy} from './types';
import { Logger, getLogger } from '../utils/logger';
import { CookieManager } from '../utils/cookie';
import { AutoCapture } from '../tracking/autocapture';
import { FormTracking } from '../tracking/form-tracking';
import { PageviewTracking } from '../tracking/pageviews';
import { BeaconTransport } from '../transport/beacon';
import { FetchTransport } from '../transport/fetch';
import { XhrTransport } from '../transport/xhr';
import { LocalStoragePersistence } from '../persistence/local-storage';
import { MemoryPersistence } from '../persistence/memory';
import {generateId, isObject, isString, isValidEmail, parseQueryString} from '../utils/helpers';
import { RetryQueue } from '../utils/queue';

export class UsermavenClient {
    private config: Config;
    private logger: Logger;
    private cookieManager: CookieManager;
    private transport: Transport;
    private persistence: LocalStoragePersistence | MemoryPersistence;
    private autoCapture?: AutoCapture;
    private formTracking?: FormTracking;
    private pageviewTracking?: PageviewTracking;
    private retryQueue: RetryQueue;
    private anonymousId: string;

    constructor(config: Config) {
        this.config = config;
        this.logger = getLogger();
        this.cookieManager = new CookieManager(config.cookieDomain);
        this.transport = this.initializeTransport(config);
        this.persistence = this.initializePersistence();
        this.retryQueue = new RetryQueue(
            this.transport,
            config.maxSendAttempts || 3,
            config.minSendTimeout || 1000,
            10,
             500  // Reduced interval to .5 second
        );
        this.anonymousId = this.getOrCreateAnonymousId();

        if (config.autocapture) {
            this.autoCapture = new AutoCapture(this);
        }

        if (config.formTracking) {
            this.formTracking = new FormTracking(this);
        }

        if (config.autoPageview) {
            this.pageviewTracking = new PageviewTracking(this);
        }

        this.logger.info('Usermaven client initialized');
    }

    public init(config: Config): void {
        this.config = { ...this.config, ...config };
        this.logger = getLogger();
        this.cookieManager = new CookieManager(this.config.cookieDomain);
        this.transport = this.initializeTransport(config);
        this.persistence = this.initializePersistence();
        this.retryQueue = new RetryQueue(this.transport, this.config.maxSendAttempts, this.config.minSendTimeout);
        this.anonymousId = this.getOrCreateAnonymousId();

        if (this.config.autocapture) {
            this.autoCapture = new AutoCapture(this);
        }

        if (this.config.formTracking) {
            this.formTracking = new FormTracking(this);
        }

        if (this.config.autoPageview) {
            this.pageviewTracking = new PageviewTracking(this);
        }

        this.logger.info('Usermaven client reinitialized');
    }

    private manageCrossDomainLinking(): void {
        if (!this.config.crossDomainLinking || !this.config.domains) {
            return;
        }

        const domains = this.config.domains.split(',').map(d => d.trim());
        const cookieName = this.config.cookieName || `__eventn_id_${this.config.apiKey}`;

        document.addEventListener('click', (event) => {
            const target = this.findClosestLink(event.target as HTMLElement);
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href || !href.startsWith('http')) return;

            const url = new URL(href);
            if (url.hostname === window.location.hostname) return;

            if (domains.includes(url.hostname)) {
                const cookie = this.cookieManager.get(cookieName);
                if (cookie) {
                    url.searchParams.append('_um', cookie);
                    target.setAttribute('href', url.toString());
                }
            }
        });

        this.logger.debug('Cross-domain linking initialized');
    }

    private findClosestLink(element: HTMLElement | null): HTMLAnchorElement | null {
        while (element && element.tagName !== 'A') {
            element = element.parentElement;
        }
        return element as HTMLAnchorElement;
    }

    private initializeTransport(config: Config): Transport {
        if (config.useBeaconApi && navigator.sendBeacon) {
            return new BeaconTransport(config.trackingHost);
        } else if (config.forceUseFetch || !window.XMLHttpRequest) {
            return new FetchTransport(config.trackingHost);
        } else {
            return new XhrTransport(config.trackingHost);
        }
    }

    private initializePersistence(): LocalStoragePersistence | MemoryPersistence {
        if (this.config.disableEventPersistence) {
            return new MemoryPersistence();
        } else {
            return new LocalStoragePersistence(this.config.apiKey);
        }
    }

    private getOrCreateAnonymousId(): string {
        const cookieName = this.config.cookieName || `__eventn_id_${this.config.apiKey}`;
        let id = this.cookieManager.get(cookieName);

        if (!id) {
            if (this.config.crossDomainLinking) {
                const urlParams = new URLSearchParams(window.location.search);
                const queryId = urlParams.get('_um');

                const urlHash = window.location.hash.substring(1);
                const hashedValues = urlHash.split("~");
                const fragmentId = hashedValues.length > 1 ? hashedValues[1] : undefined;

                id = queryId || fragmentId;
            }

            if (!id) {
                id = generateId();
            }

            // Set cookie for 10 years
            const tenYearsInDays = 365 * 10;
            this.cookieManager.set(cookieName, id, tenYearsInDays, true, false);
        }

        return id;
    }

    public async id(userData: UserProps, doNotSendEvent: boolean = false): Promise<void> {
        if (!isObject(userData)) {
            this.logger.error('User data must be an object');
            return;
        }

        if (userData.email && !isValidEmail(userData.email)) {
            this.logger.error('Invalid email provided');
            return;
        }

        if (!userData.id || !isString(userData.id)) {
            this.logger.error('User ID must be a string');
            return;
        }

        const userId = userData.id || generateId();
        this.persistence.set('userId', userId);
        this.persistence.set('userProps', userData);

        if (!doNotSendEvent) {
            const identifyPayload = {
                ...userData,
                anonymous_id: this.anonymousId,
            };

            await this.track('user_identify', identifyPayload);
        }

        this.logger.info('User identified:', userData);
    }

    public async track(typeName: string, payload?: EventPayload): Promise<void> {
        if (!isString(typeName)) {
            this.logger.error('Event name must be a string');
            return;
        }

        if (payload && !isObject(payload)) {
            this.logger.error('Event payload must be an object');
            return;
        }

        const eventPayload = this.createEventPayload(typeName, payload);

        try {
            this.retryQueue.add(eventPayload);
            this.logger.debug(`Event tracked: ${typeName}`, [eventPayload]);
        } catch (error) {
            this.logger.error(`Failed to track event: ${typeName}`, error);
        }
    }

    public async group(props: CompanyProps, doNotSendEvent: boolean = false): Promise<void> {
        if (!isObject(props)) {
            this.logger.error('Company properties must be an object');
            return;
        }

        if (!props.id || !props.name || !props.created_at) {
            this.logger.error('Company properties must include id, name, and created_at');
            return;
        }

        this.persistence.set('companyProps', props);

        if (!doNotSendEvent) {
            await this.track('group', props);
        }

        this.logger.info('Company identified:', props);
    }

    private createEventPayload(eventName: string, eventProps?: EventPayload): any {
        const userProps = this.persistence.get('userProps') || {};
        const companyProps = this.persistence.get('companyProps') || {};
        const userId = this.persistence.get('userId');
        const globalProps = this.persistence.get('global_props') || {};
        const eventTypeProps = this.persistence.get(`props_${eventName}`) || {};

        return {
            event_id: generateId(),
            user: {
                anonymous_id: this.anonymousId,
                id: userId,
                ...userProps
            },
            company: companyProps,
            ids: this.getThirdPartyIds(),
            utc_time: new Date().toISOString(),
            local_tz_offset: new Date().getTimezoneOffset(),
            referer: document.referrer,
            url: window.location.href,
            page_title: document.title,
            doc_path: window.location.pathname,
            doc_host: window.location.hostname,
            doc_search: window.location.search,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            vp_size: `${window.innerWidth}x${window.innerHeight}`,
            user_agent: navigator.userAgent,
            user_language: navigator.language,
            doc_encoding: document.characterSet,
            utm: this.getUtmParams(),
            click_id: {},
            api_key: this.config.apiKey,
            src: "usermaven",
            event_type: eventName,
            event_attributes: eventProps || {},
            ...globalProps,
            ...eventTypeProps,
        };
    }

    public getCookie(name: string): string | null {
        return this.cookieManager.get(name);
    }

    private getThirdPartyIds(): Record<string, string> {
        const thirdPartyIds: Record<string, string> = {};
        const fbpCookie = this.getCookie('_fbp');
        if (fbpCookie) {
            thirdPartyIds['fbp'] = fbpCookie;
        }
        // Add more third-party IDs as needed
        return thirdPartyIds;
    }

    private getUtmParams(): Record<string, string> {
        const utmParams: Record<string, string> = {};
        const queryParams = parseQueryString(window.location.search);
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

        utmKeys.forEach(key => {
            if (queryParams[key]) {
                utmParams[key.replace('utm_', '')] = queryParams[key];
            }
        });

        return utmParams;
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

    public async reset(resetAnonId: boolean = false): Promise<void> {
        this.persistence.clear();

        if (resetAnonId) {
            this.cookieManager.delete(this.config.cookieName || `__eventn_id_${this.config.apiKey}`);
            this.anonymousId = this.getOrCreateAnonymousId();
        }

        this.logger.info('Client state reset', { resetAnonId });
    }

    public unset(propertyName: string, options?: { eventType?: string, persist?: boolean }): void {
        const eventType = options?.eventType;
        const persist = options?.persist ?? true;

        if (eventType) {
            let props = this.persistence.get(`props_${eventType}`) || {};
            delete props[propertyName];
            this.persistence.set(`props_${eventType}`, props);
        } else {
            let props = this.persistence.get('global_props') || {};
            delete props[propertyName];
            this.persistence.set('global_props', props);
        }

        if (persist) {
            this.persistence.save();
        }

        this.logger.debug(`Property unset: ${propertyName}`, `Event type: ${eventType || 'global'}`);
    }

}
