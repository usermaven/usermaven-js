import { LogLevel } from '../utils/logger';

export interface EventPayload {
    [key: string]: any;
}

export interface UserProps extends EventPayload {
    id?: string;
    email?: string;
    company?: {
        id?: string;
        name?: string;
        created_at?: string;
        custom?: {
            [key: string]: any;
        };
    }
    [key: string]: any;
}


export interface Transport {
    send(payload: any): Promise<void>;
}

export type Policy = 'strict' | 'keep' | 'comply';

export interface CompanyProps {
    id: string;
    name: string;
    created_at: string;
    [key: string]: any;
}

/**
 * Environment where the event have happened.
 */
export type ClientProperties = {
    screen_resolution: string        //screen resolution
    user_agent: string               //user
    referer: string                  //document referer
    url: string                      //current url
    page_title: string               //page title
                                     //see UTM_TYPES for all supported utm tags
    doc_path: string                 //document path
    doc_host: string                 //document host
    doc_search: string               //document search string

    vp_size: string                  //viewport size
    user_language: string            //user language
    doc_encoding: string
}


// Autocapture
export type Property = any
export type Properties = Record<string, Property>
export interface AutoCaptureCustomProperty {
    name: string
    css_selector: string
    event_selectors: string[]
}


type CamelCaseConfig = {
    key: string;
    trackingHost: string;
    cookieDomain?: string;
    cookieName?: string;
    logLevel?: LogLevel;
    useBeaconApi?: boolean;
    forceUseFetch?: boolean;
    autocapture?: boolean;
    rageClick?: boolean;
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
    maskAllText?: boolean;
    maskAllElementAttributes?: boolean;
};

type SnakeCaseConfig = {
    key: string;
    tracking_host: string;
    cookie_domain?: string;
    cookie_name?: string;
    log_level?: LogLevel;
    use_beacon_api?: boolean;
    force_use_fetch?: boolean;
    autocapture?: boolean;
    rage_click?: boolean;
    form_tracking?: boolean | 'all' | 'tagged' | 'none';
    auto_pageview?: boolean;
    disable_event_persistence?: boolean;
    ga_hook?: boolean;
    segment_hook?: boolean;
    randomize_url?: boolean;
    capture_3rd_party_cookies?: string[] | false;
    id_method?: 'cookie' | 'localStorage';
    privacy_policy?: 'strict';
    ip_policy?: Policy;
    cookie_policy?: Policy;
    custom_headers?: Record<string, string> | (() => Record<string, string>);
    min_send_timeout?: number;
    max_send_timeout?: number;
    max_send_attempts?: number;
    properties_string_max_length?: number | null;
    property_blacklist?: string[];
    exclude?: string;
    namespace?: string;
    cross_domain_linking?: boolean;
    domains?: string;
    mask_all_text?: boolean;
    mask_all_element_attributes?: boolean;
};

export type Config = Partial<CamelCaseConfig & SnakeCaseConfig> & {
    key: string;
    trackingHost?: string;
    tracking_host?: string;
} & ({ trackingHost: string } | { tracking_host: string });
