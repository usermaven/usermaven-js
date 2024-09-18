import { LogLevel } from '../utils/logger';

export interface Config {
    apiKey: string;
    trackingHost: string;
    cookieDomain?: string;
    cookieName?: string;
    logLevel?: LogLevel;
    useBeaconApi?: boolean;
    forceUseFetch?: boolean;
    autocapture?: boolean;
    formTracking?: boolean;
    autoPageview?: boolean;
    disableEventPersistence?: boolean;
}

export const defaultConfig: Partial<Config> = {
    logLevel: LogLevel.WARN,
    useBeaconApi: false,
    forceUseFetch: false,
    autocapture: false,
    formTracking: false,
    autoPageview: false,
    disableEventPersistence: false,
};
