import {
    deleteCookie,
    generateId,
    generateRandom,
    getCookie,
    getCookieDomain,
    getCookies,
    getDataFromParams,
    getHostWithProtocol,
    getUmExclusionState,
    insertAndExecute,
    parseCookieString,
    parseQuery,
    reformatDate,
    setCookie,
} from "./helpers";
import {
    ClientProperties,
    Envs,
    Event,
    EventCompat,
    EventCtx,
    EventPayload,
    EventSrc,
    UsermavenClient,
    UsermavenOptions,
    Policy,
    TrackingEnvironment,
    UserProps, CompanyProps,
} from "./interface";

import {getLogger, setRootLogLevel} from "./log";
import {isWindowAvailable, requireWindow} from "./window";
import {CookieOpts, serializeCookie} from "./cookie";
import {IncomingMessage, ServerResponse} from "http";
import {LocalStorageQueue, MemoryQueue} from "./queue";
import {autocapture} from './autocapture';
import {_copyAndTruncateStrings, _each, _extend, _findClosestLink, _isArray, _isUndefined} from "./utils";
import FormTracking from "./form-tracking";

const VERSION_INFO = {
    env: '__buildEnv__',
    date: '__buildDate__',
    version: '__buildVersion__'
}

const USERMAVEN_VERSION = `${VERSION_INFO.version}/${VERSION_INFO.env}@${VERSION_INFO.date}`;
let MAX_AGE_TEN_YEARS = 31_622_400 * 10;

const beaconTransport: Transport = (
    url: string,
    json: string
): Promise<void> => {
    getLogger().debug("Sending beacon", json);
    const blob = new Blob([json], {type: "text/plain"});
    navigator.sendBeacon(url, blob);
    return Promise.resolve();
};

function tryFormat(string: string): string {
    if (typeof string === "string") {
        try {
            return JSON.stringify(JSON.parse(string), null, 2);
        } catch (e) {
            return string;
        }
    }
}

const echoTransport: Transport = (url: string, json: string) => {
    console.debug(`Jitsu client tried to send payload to ${url}`, tryFormat(json));
    return Promise.resolve();
};

// This is a hack to expire all cookies with non-root path left behind by invalid tracking.
// TODO remove soon
function expireNonRootCookies(name: string, path: string = undefined) {
    path = path ?? window.location.pathname
    if (path == "" || path == "/") {
        return
    }

    deleteCookie(name, path)
    expireNonRootCookies(name, path.slice(0, path.lastIndexOf("/")))
}

interface Persistence {
    save(props: Record<string, any>);

    restore(): Record<string, any> | undefined;

    delete();
}

class CookiePersistence implements Persistence {
    private cookieDomain: string;
    private cookieName: string;

    constructor(cookieDomain: string, cookieName: string) {
        this.cookieDomain = cookieDomain;
        this.cookieName = cookieName;
    }

    public save(props: Record<string, any>) {
        setCookie(this.cookieName, JSON.stringify(props), {
            domain: this.cookieDomain,
            secure: document.location.protocol !== "http:",
            maxAge: MAX_AGE_TEN_YEARS,
        });
    }

    restore(): Record<string, any> | undefined {
        expireNonRootCookies(this.cookieName)
        let str = getCookie(this.cookieName);
        if (str) {
            try {
                const parsed = JSON.parse(decodeURIComponent(str));
                if (typeof parsed !== "object") {
                    getLogger().warn(
                        `Can't restore value of ${this.cookieName}@${
                            this.cookieDomain
                        }, expected to be object, but found ${
                            typeof parsed !== "object"
                        }: ${parsed}. Ignoring`
                    );
                    return undefined;
                }
                return parsed;
            } catch (e) {
                getLogger().error("Failed to decode JSON from " + str, e);
                return undefined;
            }
        }
        return undefined;
    }

    delete() {
        deleteCookie(this.cookieName);
    }
}

class NoPersistence implements Persistence {
    public save(props: Record<string, any>) {
    }

    restore(): Record<string, any> | undefined {
        return undefined;
    }

    delete() {
    }
}

const defaultCompatMode = false;

export function usermavenClient(opts?: UsermavenOptions): UsermavenClient {
    let client = new UsermavenClientImpl();
    client.init(opts);
    return client;
}

type PermanentProperties = {
    globalProps: Record<string, any>;
    propsPerEvent: Record<string, Record<string, any>>;
};

const browserEnv: TrackingEnvironment = {
    getSourceIp: () => undefined,
    describeClient: () => ({
        referer: document.referrer,
        url: window.location.href,
        page_title: document.title,
        doc_path: document.location.pathname,
        doc_host: document.location.hostname,
        doc_search: window.location.search,
        screen_resolution: screen.width + "x" + screen.height,
        vp_size:
            Math.max(
                document.documentElement.clientWidth || 0,
                window.innerWidth || 0
            ) +
            "x" +
            Math.max(
                document.documentElement.clientHeight || 0,
                window.innerHeight || 0
            ),
        user_agent: navigator.userAgent,
        user_language: navigator.language,
        doc_encoding: document.characterSet,
    }),

    getAnonymousId: ({name, domain, crossDomainLinking = true}) => {
        expireNonRootCookies(name)

        // Check if cross domain linking is enabled
        if (crossDomainLinking) {
            // Try to extract the '_um' parameter from query string and hash fragment (https://example.com#_um=1~abcde5~)
            const urlParams = new URLSearchParams(window.location.search);
            const queryId = urlParams.get('_um');


            const urlHash = window.location.hash.substring(1);
            const hashedValues = urlHash.split("~");
            const fragmentId = hashedValues.length > 1 ? hashedValues[1] : undefined;

            // If the '_um' parameter is set in both the query string and hash fragment,
            // prioritize the one in query string
            let crossDomainAnonymousId = queryId || fragmentId;

            // If coming from another domain, use the ID from URL parameter
            if (crossDomainAnonymousId) {
                getLogger().debug("Existing user id from other domain", crossDomainAnonymousId);
                // Check if the ID needs to be set as cookie
                const currentCookie = getCookie(name);
                if (!currentCookie || currentCookie !== crossDomainAnonymousId) {
                    setCookie(name, crossDomainAnonymousId, {
                        domain,
                        secure: document.location.protocol !== "http:",
                        maxAge: MAX_AGE_TEN_YEARS,
                    });
                }
                return crossDomainAnonymousId;
            }
        }


        const idCookie = getCookie(name);
        if (idCookie) {
            getLogger().debug("Existing user id", idCookie);
            return idCookie;
        }
        let newId = generateId();
        getLogger().debug("New user id", newId);
        setCookie(name, newId, {
            domain,
            secure: document.location.protocol !== "http:",
            maxAge: MAX_AGE_TEN_YEARS,
        });
        return newId;
    },
};


function ensurePrefix(prefix: string, str?: string) {
    if (!str) {
        return str;
    }
    return str?.length > 0 && str.indexOf(prefix) !== 0 ? prefix + str : str;
}

function cutPostfix(postfixes: string | string[], str?: string) {
    for (const postfix of typeof postfixes === "string"
        ? [postfixes]
        : postfixes) {
        while (str && str.length > 0 && str.charAt(str.length - 1) === postfix) {
            str = str.substring(0, str.length - 1);
        }
    }
    return str;
}

export function fetchApi(
    req: Request,
    res: Response,
    opts: { disableCookies?: boolean } = {}
): TrackingEnvironment {
    return {
        getAnonymousId({name, domain}): string {
            if (opts?.disableCookies) {
                return "";
            }

            const cookie = parseCookieString(req.headers["cookie"])[name];
            if (!cookie) {
                const cookieOpts: CookieOpts = {
                    maxAge: 31_622_400 * 10,
                    httpOnly: false,
                };
                if (domain) {
                    cookieOpts.domain = domain;
                }
                let newId = generateId();
                res.headers.set("Set-Cookie", serializeCookie(name, newId, cookieOpts));
                return newId;
            } else {
                return cookie;
            }
        },
        getSourceIp() {
            let ip =
                req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req["ip"];
            return ip && ip.split(",")[0].trim();
        },
        describeClient(): ClientProperties {
            const requestHost = req.headers.get("host") || req.headers.get("host");
            let proto = cutPostfix(
                [":", "/"],
                req.headers["x-forwarded-proto"] || req["nextUrl"]["protocol"] || "http"
            );
            while (proto && proto.length > 0 && proto.charAt(proto.length - 1)) {
                proto = proto.substring(0, proto.length - 1);
            }
            let reqUrl = req.url || "/";
            let queryPos = reqUrl.indexOf("?");
            let path, query;
            if (queryPos >= 0) {
                path = reqUrl.substring(0, queryPos);
                query = reqUrl.substring(queryPos + 1);
            } else {
                path = reqUrl;
                query = undefined;
            }
            query = ensurePrefix(query, "?");
            path = ensurePrefix(path, "/");
            return {
                doc_encoding: "",
                doc_host: requestHost,
                doc_path: reqUrl,
                doc_search: query,
                page_title: "",
                referer: req.headers["referrer"],
                screen_resolution: "",
                url: `${proto}://${requestHost}${path || ""}${query || ""}`,
                user_agent: req.headers["user-agent"],
                user_language:
                    req.headers["accept-language"] &&
                    req.headers["accept-language"].split(",")[0],
                vp_size: "",
            };
        },
    };
}

export function httpApi(
    req: IncomingMessage,
    res: ServerResponse,
    opts: { disableCookies?: boolean } = {}
): TrackingEnvironment {
    const header: (req: IncomingMessage, name: string) => string | undefined = (
        req,
        name
    ) => {
        let vals = req.headers[name.toLowerCase()];
        if (!vals) {
            return undefined;
        }
        if (typeof vals === "string") {
            return vals;
        } else if (vals.length > 0) {
            return vals.join(",");
        }
    };

    return {
        getAnonymousId({name, domain}): string {
            if (opts?.disableCookies) {
                return "";
            }

            const cookie = parseCookieString(req.headers["cookie"])[name];
            if (!cookie) {
                const cookieOpts: CookieOpts = {
                    maxAge: 31_622_400 * 10,
                    httpOnly: false,
                };
                if (domain) {
                    cookieOpts.domain = domain;
                }
                let newId = generateId();
                res.setHeader("Set-Cookie", serializeCookie(name, newId, cookieOpts));
                return newId;
            } else {
                return cookie;
            }
        },
        getSourceIp() {
            let ip =
                header(req, "x-forwarded-for") ||
                header(req, "x-real-ip") ||
                req.socket.remoteAddress;
            return ip && ip.split(",")[0].trim();
        },
        describeClient(): ClientProperties {
            let url: Partial<URL> = req.url
                ? new URL(
                    req.url,
                    req.url.startsWith("http") ? undefined : "http://localhost"
                )
                : {};
            const requestHost =
                header(req, "x-forwarded-host") || header(req, "host") || url.hostname;
            const proto = cutPostfix(
                [":", "/"],
                header(req, "x-forwarded-proto") || url.protocol
            );
            let query = ensurePrefix("?", url.search);
            let path = ensurePrefix("/", url.pathname);
            return {
                doc_encoding: "",
                doc_host: requestHost,
                doc_path: req.url,
                doc_search: query,
                page_title: "",
                referer: header(req, "referrer"),
                screen_resolution: "",
                url: `${proto}://${requestHost}${path || ""}${query || ""}`,
                user_agent: req.headers["user-agent"],
                user_language:
                    req.headers["accept-language"] &&
                    req.headers["accept-language"].split(",")[0],
                vp_size: "",
            };
        },
    };
}

const emptyEnv: TrackingEnvironment = {
    getSourceIp: () => undefined,
    describeClient: () => ({}),
    getAnonymousId: () => "",
};
/**
 * Dictionary of supported environments
 */
export const envs: Envs = {
    httpApi: httpApi,
    nextjsApi: httpApi,
    // fetchApi: fetchApi,
    // nextjsMiddleware: fetchApi,
    browser: () => browserEnv,
    express: httpApi,
    empty: () => emptyEnv,
};

const xmlHttpTransport: Transport = (
    url: string,
    jsonPayload: string,
    additionalHeaders: Record<string, string>,
    handler = (code, body) => {
    }
) => {
    let req = new window.XMLHttpRequest();
    return new Promise<void>((resolve, reject) => {
        req.onerror = (e: any) => {
            getLogger().error(`Failed to send payload to ${url}: ${e?.message || "unknown error"}`, jsonPayload, e);
            handler(-1, {});
            reject(new Error(`Failed to send JSON. See console logs`));
        };
        req.onload = () => {
            if (req.status !== 200) {
                handler(req.status, {});
                getLogger().warn(
                    `Failed to send data to ${url} (#${req.status} - ${req.statusText})`,
                    jsonPayload
                );
                reject(
                    new Error(
                        `Failed to send JSON. Error code: ${req.status}. See logs for details`
                    )
                );
            } else {
                handler(req.status, req.responseText);
            }
            resolve();
        };
        req.open("POST", url);
        req.setRequestHeader("Content-Type", "application/json");
        Object.entries(additionalHeaders || {}).forEach(([key, val]) =>
            req.setRequestHeader(key, val)
        );
        req.send(jsonPayload);
        getLogger().debug("sending json", jsonPayload);
    });
};

const fetchTransport: (fetch: any) => Transport = (fetch) => {
    return async (
        url: string,
        jsonPayload: string,
        additionalHeaders: Record<string, string>,
        handler = (code, body) => {
        }
    ) => {
        let res: any;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(additionalHeaders || {}),
                },
                body: jsonPayload,
            });
        } catch (e: any) {
            getLogger().error(`Failed to send data to ${url}: ${e?.message || "unknown error"}`, jsonPayload, e);
            handler(-1, {});
            return
        }
        if (res.status !== 200) {
            getLogger().warn(
                `Failed to send data to ${url} (#${res.status} - ${res.statusText})`,
                jsonPayload
            );
            handler(res.status, {});
            return
        }
        let resJson = {} as any;
        let text = "";
        const contentType = res.headers?.get('Content-Type') ?? ""
        try {
            text = await res.text();
            resJson = JSON.parse(text);
        } catch (e) {
            getLogger().error(`Failed to parse ${url} response. Content-type: ${contentType} text: ${text}`, e);
        }
        try {
            handler(res.status, resJson);
        } catch (e) {
            getLogger().error(`Failed to handle ${url} response. Content-type: ${contentType} text: ${text}`, e);
        }
    };
};

type QueueStore<T> = {
    flush: () => T[]
    push: (...values: T[]) => void
}

/**
 * Abstraction on top of HTTP calls. Implementation can be either based on XMLHttpRequest, Beacon API or
 * fetch (if running in Node env)
 *
 * Implementation should reject promise if request is unsuccessful. Parameters are:
 *    - url - URL
 *    - jsonPayload - POST payload. If not string, result should be converted to string with JSON.parse()
 *    - an optional handler that will be called in any case (both for failed and succesfull requests)
 */
export type Transport = (
    url: string,
    jsonPayload: string,
    additionalHeaders: Record<string, string>,
    handler?: (statusCode: number, responseBody: any) => void
) => Promise<void>;


class UsermavenClientImpl implements UsermavenClient {

    private userIdPersistence?: Persistence;
    private propsPersistance?: Persistence;

    private userProperties: UserProps = {};
    private groupProperties: CompanyProps | any = {};
    private permanentProperties: PermanentProperties = {
        globalProps: {},
        propsPerEvent: {},
    };
    private cookieDomain: string = "";
    private trackingHost: string = "";
    private idCookieName: string = "";
    private randomizeUrl: boolean = false;
    private namespace: string = "usermaven";
    private crossDomainLinking: boolean = true;
    private formTracking: 'all' | 'tagged' | 'none' | boolean = false;
    private domains: string[] = [];

    private apiKey: string = "";
    private initialized: boolean = false;
    private _3pCookies: Record<string, boolean> = {};
    private initialOptions?: UsermavenOptions;
    private compatMode: boolean;
    private cookiePolicy: Policy = "keep";
    private ipPolicy: Policy = "keep";
    private beaconApi: boolean = false;
    private transport: Transport = xmlHttpTransport;
    private customHeaders: () => Record<string, string> = () => ({});

    private queue: QueueStore<[any, number]> = new MemoryQueue()
    private maxSendAttempts: number = 4
    private retryTimeout: [number, number] = [500, 1e12]
    private flushing: boolean = false
    private attempt: number = 1

    private propertyBlacklist: string[] = []
    public config?: any;
    // public persistence?: UserMavenPersistence;
    // public sessionManager?: SessionIdManager;

    public __autocapture_enabled = false;
    public __auto_pageview_enabled = false;
    // private anonymousId: string = '';

    // Fallback tracking host
    private trackingHostFallback: string = VERSION_INFO.env === "production" ? "https://events.usermaven.com" : "https://eventcollectors.usermaven.com";

    // Used for session + autocapture
    get_config(prop_name) {
        return this.config ? this.config[prop_name] : null
    }

    id(props: UserProps, doNotSendEvent?: boolean): Promise<void> {
        this.userProperties = {...this.userProperties, ...props}
        getLogger().debug("Usermaven user identified", props)

        if (this.userIdPersistence) {
            this.userIdPersistence.save(props);
        } else {
            getLogger().warn("Id() is called before initialization");
        }
        if (!doNotSendEvent) {
            return this.track("user_identify", {});
        } else {
            return Promise.resolve();
        }
    }

    group(props: CompanyProps, doNotSendEvent?: boolean): Promise<void> {
        this.groupProperties = {...this.groupProperties, ...props}
        getLogger().debug("Usermaven group identified", props)

        if (this.userIdPersistence) {
            // Update the 'company' property in the user persistence
            this.userIdPersistence.save({company: props});
        } else {
            getLogger().warn("Group() is called before initialization");
        }
        if (!doNotSendEvent) {
            return this.track("group", {});
        } else {
            return Promise.resolve();
        }
    }

    reset(resetAnonId?: boolean): Promise<void> {
        if (this.userIdPersistence) {
            this.userIdPersistence.delete();
        }
        if (this.propsPersistance) {
            this.propsPersistance.delete();
        }
        if (resetAnonId) {
            const idCookie = getCookie(this.idCookieName);
            if (idCookie) {
                getLogger().debug("Removing id cookie", idCookie);
                setCookie(this.idCookieName, "", {
                    domain: this.cookieDomain,
                    expires: new Date(0),
                });
            }
        }
        return Promise.resolve();
    }

    rawTrack(payload: any) {
        return this.sendJson(payload);
    }

    makeEvent(
        event_type: string,
        src: EventSrc,
        payload: EventPayload
    ): Event | EventCompat {

        let {env, ...payloadData} = payload;
        if (!env) {
            env = isWindowAvailable() ? envs.browser() : envs.empty();
        }
        this.restoreId();
        let context = this.getCtx(env);

        let persistentProps = {
            ...this.permanentProperties.globalProps,
            ...(this.permanentProperties.propsPerEvent[event_type] ?? {}),
        };
        let base = {
            api_key: this.apiKey,
            src,
            event_type,
            ...payloadData,
        };
        let sourceIp = env.getSourceIp();
        if (sourceIp) {
            base["source_ip"] = sourceIp;
        }

        return this.compatMode
            ? {...persistentProps, eventn_ctx: context, ...base}
            : {...persistentProps, ...context, ...base};
    }

    _send3p(sourceType: EventSrc, object: any, type?: string): Promise<any> {
        let eventType = "3rdparty";
        if (type && type !== "") {
            eventType = type;
        }

        const e = this.makeEvent(eventType, sourceType, {
            src_payload: object,
        });
        return this.sendJson(e);
    }

    async sendJson(json: any): Promise<void> {
        let umExclusionState = getUmExclusionState()

        if(!umExclusionState){
            if (this.maxSendAttempts > 1) {
                this.queue.push([json, 0])
                this.scheduleFlush(0)
            } else {
                await this.doSendJson(json)
            }
        }
    }

    private doSendJson(json: any): Promise<void> {
        let cookiePolicy =
            this.cookiePolicy !== "keep" ? `&cookie_policy=${this.cookiePolicy}` : "";
        let ipPolicy =
            this.ipPolicy !== "keep" ? `&ip_policy=${this.ipPolicy}` : "";
        let urlPrefix = isWindowAvailable() ? "/api/v1/event" : "/api/v1/s2s/event";
        let url = `${this.trackingHost}${urlPrefix}?token=${this.apiKey}${cookiePolicy}${ipPolicy}`;
        if (this.randomizeUrl) {
            url = `${
                this.trackingHost
            }/api.${generateRandom()}?p_${generateRandom()}=${
                this.apiKey
            }${cookiePolicy}${ipPolicy}`;
        }
        let jsonString = JSON.stringify(json);
        getLogger().debug(`Sending payload to ${url}`, json.length);
        return this.transport(url, jsonString, this.customHeaders(), (code, body) =>
            this.postHandle(code, body)
        );
    }

    scheduleFlush(timeout?: number) {
        if (this.flushing) {
            return
        }

        this.flushing = true
        if (typeof timeout === "undefined") {
            let random = Math.random() + 1
            let factor = Math.pow(2, this.attempt++)
            timeout = Math.min(this.retryTimeout[0] * random * factor, this.retryTimeout[1])
        }

        getLogger().debug(`Scheduling event queue flush in ${timeout} ms.`)

        setTimeout(() => this.flush(), timeout)
    }

    private async flush(): Promise<void> {
        if (isWindowAvailable() && !window.navigator.onLine) {
            this.flushing = false
            this.scheduleFlush()
        }

        let queue = this.queue.flush()
        this.flushing = false

        if (queue.length === 0) {
            return
        }

        try {
            await this.doSendJson(queue.map(el => el[0]))
            this.attempt = 1
            getLogger().debug(`Successfully flushed ${queue.length} events from queue`)
        } catch (e) {
            // In case of failing custom domain (trackingHost), we will replace it with default domain (trackingHostFallback)
            if (this.trackingHost !== this.trackingHostFallback) {
                getLogger().debug(`Using fallback tracking host ${this.trackingHostFallback} instead of ${this.trackingHost} on ${VERSION_INFO.env}`)
                this.trackingHost = this.trackingHostFallback
            }

            queue = queue.map(el => [el[0], el[1] + 1] as [any, number]).filter(el => {
                if (el[1] >= this.maxSendAttempts) {
                    getLogger().error(`Dropping queued event after ${el[1]} attempts since max send attempts ${this.maxSendAttempts} reached. See logs for details`)
                    return false
                }

                return true
            })

            if (queue.length > 0) {
                this.queue.push(...queue)
                this.scheduleFlush()
            } else {
                this.attempt = 1
            }
        }
    }


    postHandle(status: number, response: any): any {
        if (this.cookiePolicy === "strict" || this.cookiePolicy === "comply") {
            if (status === 200) {
                let data = response;
                if (typeof response === "string") {
                    data = JSON.parse(response);
                }
                if (!data["delete_cookie"]) {
                    return;
                }
            }
            this.userIdPersistence.delete();
            this.propsPersistance.delete();
            deleteCookie(this.idCookieName);
        }
        if (status === 200) {
            let data = response;
            if (typeof response === "string" && response.length > 0) {
                data = JSON.parse(response);
                let extras = data["jitsu_sdk_extras"];
                if (extras && extras.length > 0) {
                    const isWindow = isWindowAvailable();
                    if (!isWindow) {
                        getLogger().error(
                            "Tags destination supported only in browser environment"
                        );
                    } else {
                        for (const {type, id, value} of extras) {
                            if (type === "tag") {
                                const tag = document.createElement("div");
                                tag.id = id;
                                insertAndExecute(tag, value);
                                if (tag.childElementCount > 0) {
                                    document.body.appendChild(tag);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    getCtx(env: TrackingEnvironment): EventCtx {
        let now = new Date();
        let props = env.describeClient() || {};
        const user = {...this.userProperties}

        const company = user['company'] || {}

        delete user['company']

        const payload = {
            event_id: "", //generate id on the backend
            user: {
                ...user,
                anonymous_id:
                    this.cookiePolicy !== "strict"
                        ? env.getAnonymousId({
                            name: this.idCookieName,
                            domain: this.cookieDomain,
                            crossDomainLinking: this.crossDomainLinking,
                        })
                        : "",
            },
            ids: this._getIds(),
            utc_time: reformatDate(now.toISOString()),
            local_tz_offset: now.getTimezoneOffset(),
            ...props,
            ...getDataFromParams(parseQuery(props.doc_search)),
        };
        // id and name attributes will be checked on backend
        if (Object.keys(company).length) {
            payload['company'] = company
        }

        return payload
    }

    private _getIds(): Record<string, string> {
        if (!isWindowAvailable()) {
            return {};
        }
        let cookies = getCookies(false);
        let res: Record<string, string> = {};
        for (let [key, value] of Object.entries(cookies)) {
            if (this._3pCookies[key]) {
                res[key.charAt(0) == "_" ? key.substr(1) : key] = value;
            }
        }
        return res;
    }

    pathMatches(wildcardPath, docUrl) {
        const actualPath = new URL(docUrl).pathname;
        return actualPath.match(new RegExp('^' + wildcardPath.trim().replace(/\*\*/g, '.*').replace(/([^\.])\*/g, '$1[^\\s\/]*') + '\/?$'))
    }

    track(type: string, payload?: EventPayload): Promise<void> {
        let data = payload || {};
        getLogger().debug("track event of type", type, data);

        const env = isWindowAvailable() ? envs.browser() : envs.empty();
        const context = this.getCtx(env);
        // Check if the page is not excluded.
        if (this.config && this.config.exclude && this.config.exclude.length > 1 && context?.url) {
            const excludeList = this.config.exclude.split(',');
            // check if the current page is in the exclude list

            if (excludeList.some((excludePage) => this.pathMatches(excludePage.trim(), context?.url))) {
                getLogger().debug("Page is excluded from tracking");
                return
            }
        }

        let p = payload || {};

        // All custom events and scroll event will have event_attributes
        if (type !== "$autocapture" && type !== "user_identify" && type !== "pageview" && type !== "$pageleave") {
            p = {
                event_attributes: payload,
            }
        }

        const e = this.makeEvent(
            type,
            this.compatMode ? "eventn" : "usermaven",
            p
        );

        return this.sendJson(e);
    }

    init(options: UsermavenOptions) {
        if (isWindowAvailable() && !options.force_use_fetch) {
            if (options.fetch) {
                getLogger().warn(
                    "Custom fetch implementation is provided to Usermaven. However, it will be ignored since Usermaven runs in browser"
                );
            }
            this.transport = this.beaconApi ? beaconTransport : xmlHttpTransport;
        } else {
            if (!options.fetch && !globalThis.fetch) {
                throw new Error(
                    "Usermaven runs in Node environment. However, neither UsermavenOptions.fetch is provided, nor global fetch function is defined. \n" +
                    "Please, provide custom fetch implementation. You can get it via node-fetch package"
                );
            }
            this.transport = fetchTransport(options.fetch || globalThis.fetch);
        }

        if (
            options.custom_headers &&
            typeof options.custom_headers === "function"
        ) {
            this.customHeaders = options.custom_headers;
        } else if (options.custom_headers) {
            this.customHeaders = () =>
                options.custom_headers as Record<string, string>;
        }

        if (options.tracking_host === "echo") {
            getLogger().warn(
                'jitsuClient is configured with "echo" transport. Outgoing requests will be written to console'
            );
            this.transport = echoTransport;
        }

        if (options.ip_policy) {
            this.ipPolicy = options.ip_policy;
        }
        if (options.cookie_policy) {
            this.cookiePolicy = options.cookie_policy;
        }
        if (options.privacy_policy === "strict") {
            this.ipPolicy = "strict";
            this.cookiePolicy = "strict";
        }
        if (options.use_beacon_api && navigator.sendBeacon) {
            this.beaconApi = true;
        }

        //can't handle delete cookie response when beacon api
        if (this.cookiePolicy === "comply" && this.beaconApi) {
            this.cookiePolicy = "strict";
        }
        if (options.log_level) {
            setRootLogLevel(options.log_level);
        }
        this.initialOptions = options;
        getLogger().debug(
            "Initializing Usemaven Tracker tracker",
            options,
            USERMAVEN_VERSION
        );
        if (!options.key) {
            getLogger().error("Can't initialize Usemaven, key property is not set");
            return;
        }
        this.compatMode =
            options.compat_mode === undefined
                ? defaultCompatMode
                : !!options.compat_mode;
        this.cookieDomain = options.cookie_domain || getCookieDomain();
        this.namespace = options.namespace || "usermaven";
        this.crossDomainLinking = options.cross_domain_linking ?? true;
        this.formTracking = options.form_tracking ?? false;
        this.domains = options.domains ? (options.domains).split(',').map((domain) => domain.trim()) : [];
        this.trackingHost = getHostWithProtocol(
            options["tracking_host"] || "t.usermaven.com"
        );
        this.randomizeUrl = options.randomize_url || false;
        this.apiKey = options.key;
        this.__auto_pageview_enabled = options.auto_pageview || false;

        this.idCookieName = options.cookie_name || `__eventn_id_${options.key}`;

        if (this.cookiePolicy === "strict") {
            this.propsPersistance = new NoPersistence();
        } else {
            this.propsPersistance = isWindowAvailable()
                ? new CookiePersistence(this.cookieDomain, this.idCookieName + "_props")
                : new NoPersistence();
        }

        if (this.cookiePolicy === "strict") {
            this.userIdPersistence = new NoPersistence();
        } else {
            this.userIdPersistence = isWindowAvailable()
                ? new CookiePersistence(this.cookieDomain, this.idCookieName + "_usr")
                : new NoPersistence();
        }

        if (this.propsPersistance) {
            const restored = this.propsPersistance.restore();
            if (restored) {
                this.permanentProperties = restored as PermanentProperties;
                this.permanentProperties.globalProps = restored.globalProps ?? {};
                this.permanentProperties.propsPerEvent = restored.propsPerEvent ?? {};
            }
            getLogger().debug(
                "Restored persistent properties",
                this.permanentProperties
            );
        }


        this.propertyBlacklist = options.property_blacklist && options.property_blacklist.length > 0 ? options.property_blacklist : [];


        // // Added these configuration for session management + autocapture

        const defaultConfig = {
            autocapture: false,
            properties_string_max_length: null, // 65535
            property_blacklist: [],
            sanitize_properties: null,
            auto_pageview: false
        }
        this.config = _extend({}, defaultConfig, options || {}, this.config || {}, {token: this.apiKey})

        getLogger().debug('Default Configuration', this.config);
        // this.manageSession(this.config);

        this.manageAutoCapture(this.config);

        this.manageFormTracking(this.config);

        this.manageCrossDomainLinking({
            cross_domain_linking: this.crossDomainLinking,
            domains: this.domains,
            cookiePolicy: this.cookiePolicy
        });

        if (options.capture_3rd_party_cookies === false) {
            this._3pCookies = {};
        } else {
            (
                options.capture_3rd_party_cookies || [
                    "_ga",
                    "_fbp",
                    "_ym_uid",
                    "ajs_user_id",
                    "ajs_anonymous_id",
                ]
            ).forEach((name) => (this._3pCookies[name] = true));
        }

        if (options.ga_hook) {
            getLogger().warn("GA event interceptor isn't supported anymore");
        }
        if (options.segment_hook) {
            interceptSegmentCalls(this);
        }

        if (isWindowAvailable()) {
            if (!options.disable_event_persistence) {
                this.queue = new LocalStorageQueue(`${this.namespace}-event-queue`)
                this.scheduleFlush(0)
            }

            window.addEventListener("beforeunload", () => this.flush())
        }

        if (this.__auto_pageview_enabled) {
            enableAutoPageviews(this)
        }

        this.retryTimeout = [
            options.min_send_timeout ?? this.retryTimeout[0],
            options.max_send_timeout ?? this.retryTimeout[1],
        ]

        if (!!options.max_send_attempts) {
            this.maxSendAttempts = options.max_send_attempts!
        }

        this.initialized = true;
    }

    interceptAnalytics(analytics: any) {
        let interceptor = (chain: any) => {
            try {
                let payload = {...chain.payload};
                getLogger().debug("Intercepted segment payload", payload.obj);

                let integration = chain.integrations["Segment.io"];
                if (integration && integration.analytics) {
                    let analyticsOriginal = integration.analytics;
                    if (
                        typeof analyticsOriginal.user === "function" &&
                        analyticsOriginal.user() &&
                        typeof analyticsOriginal.user().id === "function"
                    ) {
                        payload.obj.userId = analyticsOriginal.user().id();
                    }
                }
                if (payload?.obj?.timestamp) {
                    payload.obj.sentAt = payload.obj.timestamp;
                }

                let type = chain.payload.type();
                if (type === "track") {
                    type = chain.payload.event();
                }

                this._send3p("ajs", payload, type);
            } catch (e) {
                getLogger().warn("Failed to send an event", e);
            }

            chain.next(chain.payload);
        };
        if (typeof analytics.addSourceMiddleware === "function") {
            //analytics is fully initialized
            getLogger().debug(
                "Analytics.js is initialized, calling addSourceMiddleware"
            );
            analytics.addSourceMiddleware(interceptor);
        } else {
            getLogger().debug(
                "Analytics.js is not initialized, pushing addSourceMiddleware to callstack"
            );
            analytics.push(["addSourceMiddleware", interceptor]);
        }
        analytics["__en_intercepted"] = true;
    }

    private restoreId() {
        if (this.userIdPersistence) {
            let props = this.userIdPersistence.restore();
            if (props) {
                this.userProperties = {...props, ...this.userProperties};
            }
        }
    }

    set(properties, opts?) {
        const eventType = opts?.eventType;
        const persist = opts?.persist === undefined || opts?.persist;
        if (eventType !== undefined) {
            let current = this.permanentProperties.propsPerEvent[eventType] ?? {};
            this.permanentProperties.propsPerEvent[eventType] = {
                ...current,
                ...properties,
            };
        } else {
            this.permanentProperties.globalProps = {
                ...this.permanentProperties.globalProps,
                ...properties,
            };
        }

        if (this.propsPersistance && persist) {
            this.propsPersistance.save(this.permanentProperties);
        }
    }

    unset(propertyName: string, opts) {
        requireWindow();
        const eventType = opts?.eventType;
        const persist = opts?.persist === undefined || opts?.persist;

        if (!eventType) {
            delete this.permanentProperties.globalProps[propertyName];
        } else if (this.permanentProperties.propsPerEvent[eventType]) {
            delete this.permanentProperties.propsPerEvent[eventType][propertyName];
        }
        if (this.propsPersistance && persist) {
            this.propsPersistance.save(this.permanentProperties);
        }
    }

    manageCrossDomainLinking(options: {
        cross_domain_linking?: boolean;
        domains?: string[];
        cookiePolicy?: Policy;
    }): boolean {
        if (!isWindowAvailable() || !options.cross_domain_linking || options.domains.length === 0 || options.cookiePolicy === "strict") {
            return false;
        }
        const cookieName = this.idCookieName;

        const domains = options.domains || [];

        // Listen for all clicks on the page
        document.addEventListener('click', function (event) {

            // Find the closest link
            const target = _findClosestLink(event.target as HTMLElement | null);
            if (target) {
                // Check if the link is pointing to a different domain
                const href = target?.hasAttribute('href') ? target?.getAttribute('href') : ''
                if (href && href.startsWith('http')) {
                    const url = new URL(href);

                    const cookie = getCookie(cookieName);

                    // Skip the link if it's pointing to the current domain
                    if (url.hostname === window.location.hostname) {
                        return;
                    }

                    if (domains.includes(url.hostname) && cookie) {

                        // Add the '_um' parameter to the URL
                        url.searchParams.append('_um', cookie);
                        target.setAttribute('href', url.toString());
                    }
                }
            }
        }, false);
    }


    /**
     * Manage auto-capturing
     * @param options
     */
    manageAutoCapture(options: UsermavenOptions) {
        getLogger().debug("Auto Capture Status: ", this.config['autocapture']);

        this.__autocapture_enabled = this.config['autocapture'] && isWindowAvailable();

        if (!this.__autocapture_enabled) {
            return
        }

        var num_buckets = 100
        var num_enabled_buckets = 100
        if (!autocapture.enabledForProject(this.apiKey, num_buckets, num_enabled_buckets)) {
            this.config['autocapture'] = false
            this.__autocapture_enabled = false
            getLogger().debug('Not in active bucket: disabling Automatic Event Collection.')
        } else if (!autocapture.isBrowserSupported()) {
            this.config['autocapture'] = false
            this.__autocapture_enabled = false
            getLogger().debug('Disabling Automatic Event Collection because this browser is not supported')
        } else {
            getLogger().debug('Autocapture enabled...')
            autocapture.init(this, options)
        }
    }

    /**
     * Manage form tracking
     */
    manageFormTracking(options: UsermavenOptions) {
        if (!isWindowAvailable() || !this.formTracking || this.formTracking === "none") {
            return
        }

        getLogger().debug('Form tracking enabled...')

        // all and true are the same
        const trackingType = this.formTracking === true ? 'all' : this.formTracking

        FormTracking.getInstance(this, trackingType).track()
    }

    /**
     * Capture an event. This is the most important and
     * frequently used usermaven function.
     *
     * ### Usage:
     *     usermaven.capture('Registered', {'Gender': 'Male', 'Age': 21}, {});
     *
     * @param {String} event_name The name of the event. This can be anything the user does - 'Button Click', 'Sign Up', 'Item Purchased', etc.
     * @param {Object} [properties] A set of properties to include with the event you're sending. These describe the user who did the event or details about the event itself.
     * @param {Object} [options] Optional configuration for this capture request.
     * @param {String} [options.transport] Transport method for network request ('XHR' or 'sendBeacon').
     */
    capture(event_name, properties = {}) {
        if (!this.initialized) {
            console.error('Trying to capture event before initialization')
            return;
        }
        if (_isUndefined(event_name) || typeof event_name !== 'string') {
            console.error('No event name provided to usermaven.capture')
            return
        }
        // if (_.isBlockedUA(userAgent)) {
        //   return
        // }


        let data = {
            event: event_name + (properties['$event_type'] ? '_' + properties['$event_type'] : ''),
            properties: this._calculate_event_properties(event_name, properties),
        };

        data = _copyAndTruncateStrings(data, this.get_config('properties_string_max_length'))

        // send event if there is a tagname available
        if (data.properties?.autocapture_attributes?.tag_name) {
            this.track("$autocapture", data.properties)
            // this.track(data.event, data.properties)
        }

        // send event if the event is $scroll
        if (event_name === '$scroll') {
            this.track(event_name, data.properties)
        }

        // send event if the event is $form
        if (event_name === '$form') {
            this.track(event_name, data.properties)
        }

    }

    _calculate_event_properties(event_name, event_properties) {
        // set defaults
        let properties = event_properties || {}

        if (event_name === '$snapshot' || event_name === '$scroll' || event_name === '$form') {
            return properties
        }

        if (_isArray(this.propertyBlacklist)) {
            _each(this.propertyBlacklist, function (blacklisted_prop) {
                delete properties[blacklisted_prop]
            })
        } else {
            console.error('Invalid value for property_blacklist config: ' + this.propertyBlacklist)
        }

        // assign first element from $elements only
        let attributes = {};
        const elements = properties['$elements'] || []
        if (elements.length) {
            attributes = elements[0];
        }

        properties['autocapture_attributes'] = attributes;
        properties['autocapture_attributes']["el_text"] = properties['autocapture_attributes']["$el_text"] ?? "";
        properties['autocapture_attributes']["event_type"] = properties["$event_type"] ?? "";
        ['$ce_version', "$event_type", "$initial_referrer", "$initial_referring_domain", "$referrer", "$referring_domain", "$elements"].forEach((key) => {
            delete properties[key]
        })
        // TODO: later remove this from the autotrack code.
        delete properties['autocapture_attributes']["$el_text"];
        delete properties['autocapture_attributes']["nth_child"];
        delete properties['autocapture_attributes']["nth_of_type"];
        return properties
    }
}

function enableAutoPageviews (t: UsermavenClient) {
    const page = () => t.track("pageview");
    // Attach pushState and popState listeners
    const originalPushState = history.pushState;
    if (originalPushState) {
        // eslint-disable-next-line functional/immutable-data
        history.pushState = function (data, title, url) {
            originalPushState.apply(this, [data, title, url]);
            page();
        };
        addEventListener('popstate', page);
    }

    addEventListener('hashchange', page);
}

function interceptSegmentCalls(t: UsermavenClient) {
    let win = window as any;
    if (!win.analytics) {
        win.analytics = [];
    }
    t.interceptAnalytics(win.analytics);
}
