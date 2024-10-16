import {Config, defaultConfig} from './config';
import {UserProps, EventPayload, Transport, CompanyProps, Policy} from './types';
import { Logger, getLogger } from '../utils/logger';
import { CookieManager } from '../utils/cookie';
import AutoCapture from '../tracking/autocapture';
import { PageviewTracking } from '../tracking/pageviews';
import { BeaconTransport } from '../transport/beacon';
import { FetchTransport } from '../transport/fetch';
import { XhrTransport } from '../transport/xhr';
import { LocalStoragePersistence } from '../persistence/local-storage';
import { MemoryPersistence } from '../persistence/memory';
import {generateId, isObject, isString, isValidEmail, parseQueryString} from '../utils/helpers';
import { RetryQueue } from '../utils/queue';
import {isWindowAvailable} from "../utils/common";
import {RageClick} from "../extensions/rage-click";
import {HttpsTransport} from "../transport/https";
import FormTracking from "../tracking/form-tracking";

export class UsermavenClient {
    private config: Config;
    private logger: Logger;
    private cookieManager?: CookieManager;
    private transport: Transport;
    private persistence: LocalStoragePersistence | MemoryPersistence;
    private autoCapture?: AutoCapture;
    private formTracking?: FormTracking;
    private pageviewTracking?: PageviewTracking;
    private retryQueue: RetryQueue;
    private anonymousId: string;
    private namespace: string;
    private rageClick?: RageClick;

    constructor(config: Config) {
        this.config = this.mergeConfig(config, defaultConfig);
        this.logger = getLogger();
        this.namespace = config.namespace || 'usermaven';
        this.transport = this.initializeTransport(this.config);
        this.persistence = this.initializePersistence();
        this.retryQueue = new RetryQueue(
            this.transport,
            this.config.maxSendAttempts || 3,
            this.config.minSendTimeout || 1000,
            10,
            200  // Reduced interval to .2 second
        );

        if (isWindowAvailable()) {
            this.initializeBrowserFeatures();
        }

        this.anonymousId = this.getOrCreateAnonymousId();


        this.logger.info(`Usermaven client initialized for namespace: ${this.namespace}`);
    }

    private initializeBrowserFeatures(): void {
        this.cookieManager = new CookieManager(this.config.cookieDomain);

        if (this.config.autocapture && AutoCapture.enabledForProject(this.config.key)) {
            this.autoCapture = new AutoCapture(this, this.config);
            this.autoCapture.init();
        }

        if (this.config.formTracking) {
            const trackingType = this.config.formTracking === true ? 'all' : this.config.formTracking;
            this.formTracking = FormTracking.getInstance(this, trackingType || "none", {
                trackFieldChanges: false,
            });
        }

        if (this.config.autoPageview) {
            this.pageviewTracking = new PageviewTracking(this);
        }

        if (this.config.crossDomainLinking) {
            this.manageCrossDomainLinking();
        }

        if (this.config.rageClick) {
            this.rageClick = new RageClick(this);
        }

        // Setup page leave tracking
        this.setupPageLeaveTracking();
    }

    /**
     * Recursively merge the provided configuration with the existing defaultConfig
     * @param config
     * @param defaultConfig
     */
    mergeConfig(config: Partial<Config>, defaultConfig: Partial<Config>): Config {
        // remove undefined values from the config
        const cleanConfig = JSON.parse(JSON.stringify(config));
        let newConfig = {...defaultConfig, ...cleanConfig};

        // recursively merge objects
        Object.keys(defaultConfig).forEach((key) => {
            if (isObject(defaultConfig[key as keyof Config])) {
                newConfig[key] = this.mergeConfig(config[key], defaultConfig[key]);
            }
        });


        return newConfig as Config;

    }

    public init(config: Config): void {
        this.config = { ...this.config, ...config };
        this.logger = getLogger();
        this.namespace = config.namespace || this.namespace;
        this.transport = this.initializeTransport(config);
        this.persistence = this.initializePersistence();
        this.retryQueue = new RetryQueue(
            this.transport,
            this.config.maxSendAttempts || 3,
            this.config.minSendTimeout || 1000,
            10,
            250  // Reduced interval to .25 second
        );

        if (isWindowAvailable()) {
            this.initializeBrowserFeatures();
        }

        this.anonymousId = this.getOrCreateAnonymousId();

        this.logger.info(`Usermaven client reinitialized for namespace: ${this.namespace}`);
    }

    private manageCrossDomainLinking(): void {
        if (!this.config.crossDomainLinking || !this.config.domains) {
            return;
        }

        const domains = this.config.domains.split(',').map(d => d.trim());
        // const cookieName = this.config.cookieName || `__eventn_id_${this.config.key}`;
        const cookieName = this.config.cookieName || `${this.namespace}_id_${this.config.key}`;


        document.addEventListener('click', (event) => {
            const target = this.findClosestLink(event.target as HTMLElement);
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href || !href.startsWith('http')) return;

            const url = new URL(href);
            if (url.hostname === window.location.hostname) return;

            if (domains.includes(url.hostname)) {
                const cookie = this.cookieManager?.get(cookieName);
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
        if (!isWindowAvailable()) {
            return new HttpsTransport(config.trackingHost, config);
        }

        const isXhrAvailable = 'XMLHttpRequest' in window;
        const isFetchAvailable = typeof fetch !== 'undefined';
        const isBeaconAvailable = typeof navigator !== 'undefined' && 'sendBeacon' in navigator;

        if (config.useBeaconApi && isBeaconAvailable) {
            return new BeaconTransport(config.trackingHost, config);
        } else if (config.forceUseFetch && isFetchAvailable) {
            return new FetchTransport(config.trackingHost, config);
        } else if (isXhrAvailable) {
            return new XhrTransport(config.trackingHost, config);
        } else if (isFetchAvailable) {
            return new FetchTransport(config.trackingHost, config);
        } else {
            throw new Error('No suitable transport method available');
        }
    }


    private initializePersistence(): LocalStoragePersistence | MemoryPersistence {
        if (this.config.disableEventPersistence || !isWindowAvailable()) {
            return new MemoryPersistence();
        } else {
            return new LocalStoragePersistence(`${this.namespace}_${this.config.key}`);
        }
    }

    private getOrCreateAnonymousId(): string {
        if (!isWindowAvailable()) {
            return generateId(); // Use a function to generate a unique ID for server-side
        }

        if (this.config.privacyPolicy === 'strict' || this.config.cookiePolicy === 'strict') {
            return this.generateFingerprint();
        }

        const cookieName = this.config.cookieName || `${this.namespace}_id_${this.config.key}`;
        let id = this.cookieManager?.get(cookieName);

        if (!id) {
            if (this.config.crossDomainLinking) {
                const urlParams = new URLSearchParams(window.location.search);
                const queryId = urlParams.get('_um');

                const urlHash = window.location.hash.substring(1);
                const hashedValues = urlHash.split("~");
                const fragmentId = hashedValues.length > 1 ? hashedValues[1] : undefined;

                id = queryId || fragmentId || generateId();
            }

            if (!id) {
                id = generateId();
            }

            // Set cookie for 10 years
            const tenYearsInDays = 365 * 10;
            this.cookieManager?.set(cookieName, id, tenYearsInDays, true, false);
        }

        return id;
    }

    private generateFingerprint(): string {
        const userAgent = navigator.userAgent;
        const screenResolution = `${screen.width}x${screen.height}`;
        const colorDepth = screen.colorDepth;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const fingerprintData = `${userAgent}|${screenResolution}|${colorDepth}|${timezone}`;
        return this.hashString(fingerprintData);
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    public async id(userData: UserProps, doNotSendEvent: boolean = false): Promise<void> {
        if (!isObject(userData)) {
            throw new Error('User data must be an object');
        }

        if (userData.email && !isValidEmail(userData.email)) {
            throw new Error('Invalid email provided');
        }

        if (!userData.id || !isString(userData.id)) {
            throw new Error('User ID must be a string');
        }

        const userId = userData.id;
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

    public track(typeName: string, payload?: EventPayload, directSend: boolean = false): void {
        this.trackInternal(typeName, payload, directSend);
    }

    private trackInternal(typeName: string, payload?: EventPayload, directSend: boolean = false): void {
        if (!isString(typeName)) {
            throw new Error('Event name must be a string');
        }

        if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
            throw new Error('Event payload must be a non-null object and not an array');
        }

        const eventPayload = this.createEventPayload(typeName, payload);

        try {
            if (directSend) {
                this.transport.send(eventPayload);
                this.logger.debug(`Event sent: ${typeName}`, [eventPayload]);
                return;
            }
            this.retryQueue.add(eventPayload);
            this.logger.debug(`Event tracked: ${typeName}`, [eventPayload]);
        } catch (error) {
            this.logger.error(`Failed to track event: ${typeName}`, error);
            throw new Error(`Failed to track event: ${typeName}`);
        }
    }

    public rawTrack(payload: any): void {
        if (!isObject(payload)) {
            throw new Error('Event payload must be an object');
        }

        this.track('raw', payload);
    }


    public async group(props: CompanyProps, doNotSendEvent: boolean = false): Promise<void> {
        if (!isObject(props)) {
            throw new Error('Company properties must be an object');
        }

        if (!props.id || !props.name || !props.created_at) {
            throw new Error('Company properties must include id, name, and created_at');
        }

        this.persistence.set('companyProps', props);

        if (!doNotSendEvent) {
            await this.track('group', props);
        }

        this.logger.info('Company identified:', props);
    }

    private createEventPayload(eventName: string, eventProps?: EventPayload): any {
        const userProps = this.persistence.get('userProps') || {};
        const companyProps = this.persistence.get('companyProps') || undefined;
        const userId = this.persistence.get('userId');
        const globalProps = this.persistence.get('global_props') || {};
        const eventTypeProps = this.persistence.get(`props_${eventName}`) || {};

        let processedProps = eventProps || {};

        const payload: any = {
            event_id: generateId(),
            user: {
                anonymous_id: this.anonymousId,
                id: userId,
                ...userProps
            },
            ...(companyProps && { company: companyProps }),
            ids: this.getThirdPartyIds(),
            utc_time: new Date().toISOString(),
            local_tz_offset: new Date().getTimezoneOffset(),
            api_key: this.config.key,
            src: "usermaven",
            event_type: eventName,
            namespace: this.namespace,
            ...globalProps,
            ...eventTypeProps,
        };

        // Process autocapture attributes if it's an autocapture event
        if (eventName === '$autocapture') {
            const autocaptureAttributes = this.processAutocaptureAttributes(eventProps || {});
            payload.autocapture_attributes = autocaptureAttributes;
        } else {
            // Apply property blacklist for non-autocapture events
            if (Array.isArray(this.config.propertyBlacklist)) {
                this.config.propertyBlacklist.forEach(prop => {
                    delete processedProps[prop];
                });
            }
            payload.event_attributes = processedProps;
        }

        if (isWindowAvailable()) {
            payload.referer = document.referrer;
            payload.url = window.location.href;
            payload.page_title = document.title;
            payload.doc_path = window.location.pathname;
            payload.doc_host = window.location.hostname;
            payload.doc_search = window.location.search;
            payload.screen_resolution = `${window.screen.width}x${window.screen.height}`;
            payload.vp_size = `${window.innerWidth}x${window.innerHeight}`;
            payload.user_agent = navigator.userAgent;
            payload.user_language = navigator.language;
            payload.doc_encoding = document.characterSet;
            payload.utm = this.getUtmParams();
        }

        return payload;
    }

    private processAutocaptureAttributes(eventProps: any): any {
        let attributes: any = {};
        const elements = eventProps['$elements'] || [];
        if (elements.length) {
            attributes = { ...elements[0] };
        }

        attributes["el_text"] = attributes["$el_text"] || "";
        attributes["event_type"] = eventProps["$event_type"] || "";

        // Remove properties that should not be included
        ['$ce_version', "$event_type", "$initial_referrer", "$initial_referring_domain", "$referrer", "$referring_domain", "$elements"].forEach((key) => {
            delete attributes[key];
        });

        // Remove additional properties as per the old code
        delete attributes["$el_text"];
        delete attributes["nth_child"];
        delete attributes["nth_of_type"];

        return attributes;
    }

    public getCookie(name: string): string | null {
        return this.cookieManager?.get(name) || null;
    }

    private getThirdPartyIds(): Record<string, string> {
        const thirdPartyIds: Record<string, string> = {};
        if (isWindowAvailable()) {
            const fbpCookie = this.getCookie('_fbp');
            if (fbpCookie) {
                thirdPartyIds['fbp'] = fbpCookie;
            }
        }
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
        if (isWindowAvailable()) {
            this.track('pageview', {
                url: window.location.href,
                referrer: document.referrer,
                title: document.title,
            }, true);
        } else {
            this.logger.warn('Pageview tracking is not available in server-side environments');
        }
    }

    private setupPageLeaveTracking(): void {
        if (!isWindowAvailable()) return;

        let isLeaving = false;
        let isRefreshing = false;

        const trackPageLeave = () => {
            if (!isLeaving && !isRefreshing) {
                isLeaving = true;
                this.track('$pageleave', {
                    url: window.location.href,
                    referrer: document.referrer,
                    title: document.title,
                });
            }
        };

        // Check for refresh
        window.addEventListener('beforeunload', (event) => {
            isRefreshing = true;
            setTimeout(() => {
                isRefreshing = false;
            }, 100);
        });

        // Track on visibilitychange event (when the page becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && !isRefreshing) {
                trackPageLeave();
            }
        });

        // For Single Page Applications, track when the user navigates away
        const originalPushState = history.pushState;
        history.pushState = function() {
            trackPageLeave();
            return originalPushState.apply(this, arguments as any);
        };

        window.addEventListener('popstate', trackPageLeave);
    }

    public getConfig(): Config {
        return this.config;
    }

    public getLogger(): Logger {
        return this.logger;
    }

    public async reset(resetAnonId: boolean = false): Promise<void> {
        this.persistence.clear();

        if (resetAnonId && this.cookieManager) {
            const cookieName = this.config.cookieName || `${this.namespace}_id_${this.config.key}`;
            this.cookieManager.delete(cookieName);
            this.anonymousId = this.getOrCreateAnonymousId();
        }

        this.logger.info('core state reset', { resetAnonId, namespace: this.namespace });
    }

    public set(properties: Record<string, any>, opts?: { eventType?: string, persist?: boolean }): void {
        if (!isObject(properties)) {
            throw new Error('Properties must be an object');
        }

        const eventType = opts?.eventType;
        const persist = opts?.persist ?? true;

        if (eventType) {
            let props = this.persistence.get(`props_${eventType}`) || {};
            props = { ...props, ...properties };
            this.persistence.set(`props_${eventType}`, props);
        } else {
            let globalProps = this.persistence.get('global_props') || {};
            globalProps = { ...globalProps, ...properties };
            this.persistence.set('global_props', globalProps);
        }

        if (persist) {
            this.persistence.save();
        }

        this.logger.debug(`Properties set`, {
            properties,
            eventType: eventType || 'global',
            persist
        });
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
