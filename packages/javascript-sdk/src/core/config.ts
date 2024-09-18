import { LogLevel } from '../utils/logger';
import { Policy } from './types';

export interface Config {
    apiKey: string;
    trackingHost: string;
    cookieDomain?: string;
    cookieName?: string;
    logLevel?: LogLevel;
    useBeaconApi?: boolean;
    forceUseFetch?: boolean;
    autocapture?: boolean;
    formTracking?: boolean | 'all' | 'tagged' | 'none';
    autoPageview?: boolean;
    disableEventPersistence?: boolean;
    gaHook?: boolean;
    segmentHook?: boolean;
    randomizeUrl?: boolean;
    capture3rdPartyCookies?: string[] | false;
    idMethod?: 'cookie' | 'localStorage';
    privacyPolicy?: 'strict';
    ipPolicy?: Policy;
    cookiePolicy?: Policy;
    customHeaders?: Record<string, string> | (() => Record<string, string>);
    minSendTimeout?: number;
    maxSendTimeout?: number;
    maxSendAttempts?: number;
    propertiesStringMaxLength?: number | null;
    propertyBlacklist?: string[];
    exclude?: string;
    namespace?: string;
    crossDomainLinking?: boolean;
    domains?: string;
    compatMode?: boolean;
    fetch?: any;
}

export const defaultConfig: Partial<Config> = {
    logLevel: LogLevel.WARN,
    useBeaconApi: false,
    forceUseFetch: false,
    autocapture: false,
    formTracking: false,
    autoPageview: false,
    disableEventPersistence: false,
    gaHook: false,
    segmentHook: false,
    randomizeUrl: false,
    capture3rdPartyCookies: ['_ga', '_fbp', '_ym_uid', 'ajs_user_id', 'ajs_anonymous_id'],
    idMethod: 'cookie',
    ipPolicy: 'keep',
    cookiePolicy: 'keep',
    minSendTimeout: 0,
    maxSendTimeout: 2000,
    maxSendAttempts: 4,
    propertiesStringMaxLength: null,
    propertyBlacklist: [],
    crossDomainLinking: true,
    compatMode: false,
};
