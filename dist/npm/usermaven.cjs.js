/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var getCookieDomain = function () {
    return location.hostname.replace('www.', '');
};
var cookieParsingCache;
var getCookies = function (useCache) {
    if (useCache === void 0) { useCache = false; }
    if (useCache && cookieParsingCache) {
        return cookieParsingCache;
    }
    var res = {};
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var idx = cookie.indexOf('=');
        if (idx > 0) {
            res[cookie.substr(i > 0 ? 1 : 0, i > 0 ? idx - 1 : idx)] = cookie.substr(idx + 1);
        }
    }
    cookieParsingCache = res;
    return res;
};
var getCookie = function (name) {
    if (!name) {
        return null;
    }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(name).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
};
var setCookie = function (name, value, expire, domain, secure) {
    var expireString = expire === Infinity ? " expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + expire;
    document.cookie = encodeURIComponent(name) + "=" + value + "; path=/;" + expireString + (domain ? "; domain=" + domain : "") + (secure ? "; secure" : "");
};
var deleteCookie = function (name) {
    document.cookie = name + '= ; expires = Thu, 01 Jan 1970 00:00:00 GMT';
};
var generateId = function () { return Math.random().toString(36).substring(2, 12); };
var generateRandom = function () { return Math.random().toString(36).substring(2, 7); };
var parseQuery = function (qs) {
    var queryString = qs || window.location.search.substring(1);
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
};
var UTM_TYPES = {
    utm_source: "source",
    utm_medium: "medium",
    utm_campaign: "campaign",
    utm_term: "term",
    utm_content: "content"
};
var CLICK_IDS = {
    gclid: true,
    fbclid: true,
    dclid: true
};
var getDataFromParams = function (params) {
    var result = {
        utm: {},
        click_id: {}
    };
    for (var name in params) {
        if (!params.hasOwnProperty(name)) {
            continue;
        }
        var val = params[name];
        var utm = UTM_TYPES[name];
        if (utm) {
            result.utm[utm] = val;
        }
        else if (CLICK_IDS[name]) {
            result.click_id[name] = val;
        }
    }
    return result;
};
//2020-08-24T13:42:16.439Z -> 2020-08-24T13:42:16.439123Z
var reformatDate = function (strDate) {
    var end = strDate.split('.')[1];
    if (!end) {
        return strDate;
    }
    if (end.length >= 7) {
        return strDate;
    }
    return strDate.slice(0, -1) + '0'.repeat(7 - end.length) + 'Z';
};
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
var getHostWithProtocol = function (host) {
    while (endsWith(host, "/")) {
        host = host.substr(0, host.length - 1);
    }
    if (host.indexOf("https://") === 0 || host.indexOf("http://") === 0) {
        return host;
    }
    else {
        return "//" + host;
    }
};

var LogLevels = {
    DEBUG: { name: "DEBUG", severity: 10 },
    INFO: { name: "INFO", severity: 100 },
    WARN: { name: "WARN", severity: 1000 },
    ERROR: { name: "ERROR", severity: 10000 },
    NONE: { name: "NONE", severity: 10000 }
};
var rootLogger = null;
/**
 * Create logger or return cached instance
 */
function getLogger() {
    if (rootLogger) {
        return rootLogger;
    }
    else {
        return rootLogger = createLogger();
    }
}
function setRootLogLevel(logLevelName) {
    var logLevel = LogLevels[logLevelName.toLocaleUpperCase()];
    if (!logLevel) {
        console.warn("Can't find log level with name ".concat(logLevelName.toLocaleUpperCase(), ", defaulting to INFO"));
        logLevel = LogLevels.INFO;
    }
    rootLogger = createLogger(logLevel);
    return rootLogger;
}
function setDebugVar(name, val) {
    var win = window;
    if (!win.__usermavenDebug) {
        win.__usermavenDebug = {};
    }
    win.__usermavenDebug[name] = val;
}
/**
 * Creates a loggger with given log-level
 * @param logLevel
 */
function createLogger(logLevel) {
    var globalLogLevel = window['__eventNLogLevel'];
    var minLogLevel = LogLevels.WARN;
    if (globalLogLevel) {
        var level = LogLevels[globalLogLevel.toUpperCase()];
        if (level && level > 0) {
            minLogLevel = level;
        }
    }
    else if (logLevel) {
        minLogLevel = logLevel;
    }
    var logger = { minLogLevel: minLogLevel };
    Object.values(LogLevels).forEach(function (_a) {
        var name = _a.name, severity = _a.severity;
        logger[name.toLowerCase()] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (severity >= minLogLevel.severity && args.length > 0) {
                var message = args[0];
                var msgArgs = args.splice(1);
                var msgFormatted = "[J-".concat(name, "] ").concat(message);
                if (name === 'DEBUG' || name === 'INFO') {
                    console.log.apply(console, __spreadArray([msgFormatted], msgArgs, false));
                }
                else if (name === 'WARN') {
                    console.warn.apply(console, __spreadArray([msgFormatted], msgArgs, false));
                }
                else {
                    console.error.apply(console, __spreadArray([msgFormatted], msgArgs, false));
                }
            }
        };
    });
    setDebugVar("logger", logger);
    return logger;
}

var VERSION_INFO = {
    env: 'development',
    date: '2022-01-07T22:00:58.476Z',
    version: '1.0.0'
};
var USERMAVEN_VERSION = "".concat(VERSION_INFO.version, "/").concat(VERSION_INFO.env, "@").concat(VERSION_INFO.date);
var beaconTransport = function (url, json) {
    getLogger().debug('Sending beacon', json);
    var blob = new Blob([json], { type: 'text/plain' });
    navigator.sendBeacon(url, blob);
    return Promise.resolve();
};
var CookiePersistence = /** @class */ (function () {
    function CookiePersistence(cookieDomain, cookieName) {
        this.cookieDomain = cookieDomain;
        this.cookieName = cookieName;
    }
    CookiePersistence.prototype.save = function (props) {
        setCookie(this.cookieName, encodeURIComponent(JSON.stringify(props)), Infinity, this.cookieDomain, document.location.protocol !== 'http:');
    };
    CookiePersistence.prototype.restore = function () {
        var str = getCookie(this.cookieName);
        if (str) {
            try {
                var parsed = JSON.parse(decodeURIComponent(str));
                if (typeof parsed !== 'object') {
                    getLogger().warn("Can't restore value of ".concat(this.cookieName, "@").concat(this.cookieDomain, ", expected to be object, but found ").concat(typeof parsed !== 'object', ": ").concat(parsed, ". Ignoring"));
                    return undefined;
                }
                return parsed;
            }
            catch (e) {
                getLogger().error('Failed to decode JSON from ' + str, e);
                return undefined;
            }
        }
        return undefined;
    };
    CookiePersistence.prototype.delete = function () {
        deleteCookie(this.cookieName);
    };
    return CookiePersistence;
}());
var NoPersistence = /** @class */ (function () {
    function NoPersistence() {
    }
    NoPersistence.prototype.save = function (props) {
    };
    NoPersistence.prototype.restore = function () {
        return undefined;
    };
    NoPersistence.prototype.delete = function () { };
    return NoPersistence;
}());
var defaultCompatMode = false;
function usermavenClient(opts) {
    var client = new UsermavenClientImpl();
    client.init(opts);
    return client;
}
var UsermavenClientImpl = /** @class */ (function () {
    function UsermavenClientImpl() {
        this.anonymousId = '';
        this.userProperties = {};
        this.permanentProperties = { globalProps: {}, propsPerEvent: {} };
        this.cookieDomain = '';
        this.trackingHost = '';
        this.idCookieName = '';
        this.randomizeUrl = false;
        this.apiKey = '';
        this.initialized = false;
        this._3pCookies = {};
        this.cookiePolicy = 'keep';
        this.ipPolicy = 'keep';
        this.beaconApi = false;
    }
    UsermavenClientImpl.prototype.id = function (props, doNotSendEvent) {
        this.userProperties = __assign(__assign({}, this.userProperties), props);
        getLogger().debug('Usermaven user identified', props);
        if (this.userIdPersistence) {
            this.userIdPersistence.save(props);
        }
        else {
            getLogger().warn('Id() is called before initialization');
        }
        if (!doNotSendEvent) {
            return this.track('user_identify', {});
        }
        else {
            return Promise.resolve();
        }
    };
    UsermavenClientImpl.prototype.rawTrack = function (payload) {
        this.sendJson(payload);
    };
    UsermavenClientImpl.prototype.getAnonymousId = function () {
        var idCookie = getCookie(this.idCookieName);
        if (idCookie) {
            getLogger().debug('Existing user id', idCookie);
            return idCookie;
        }
        var newId = generateId();
        getLogger().debug('New user id', newId);
        setCookie(this.idCookieName, newId, Infinity, this.cookieDomain, document.location.protocol !== 'http:');
        return newId;
    };
    UsermavenClientImpl.prototype.makeEvent = function (event_type, src, payload) {
        var _a;
        this.restoreId();
        var context = this.getCtx();
        var persistentProps = __assign(__assign({}, this.permanentProperties.globalProps), ((_a = this.permanentProperties.propsPerEvent[event_type]) !== null && _a !== void 0 ? _a : {}));
        var base = __assign({ api_key: this.apiKey, src: src, event_type: event_type }, payload);
        return this.compatMode ? __assign(__assign(__assign({}, persistentProps), { eventn_ctx: context }), base) : __assign(__assign(__assign({}, persistentProps), context), base);
    };
    UsermavenClientImpl.prototype._send3p = function (sourceType, object, type) {
        var eventType = '3rdparty';
        if (type && type !== '') {
            eventType = type;
        }
        var e = this.makeEvent(eventType, sourceType, {
            src_payload: object
        });
        return this.sendJson(e);
    };
    UsermavenClientImpl.prototype.sendJson = function (json) {
        var cookiePolicy = this.cookiePolicy !== 'keep' ? "&cookie_policy=".concat(this.cookiePolicy) : '';
        var ipPolicy = this.ipPolicy !== 'keep' ? "&ip_policy=".concat(this.ipPolicy) : '';
        var url = "".concat(this.trackingHost, "/api/v1/event?token=").concat(this.apiKey).concat(cookiePolicy).concat(ipPolicy);
        if (this.randomizeUrl) {
            url = "".concat(this.trackingHost, "/api.").concat(generateRandom(), "?p_").concat(generateRandom(), "=").concat(this.apiKey).concat(cookiePolicy).concat(ipPolicy);
        }
        var jsonString = JSON.stringify(json);
        if (this.beaconApi) {
            return beaconTransport(url, jsonString);
        }
        else {
            return this.xmlHttpReqTransport(url, jsonString);
        }
    };
    UsermavenClientImpl.prototype.xmlHttpReqTransport = function (url, json) {
        var _this = this;
        var req = new XMLHttpRequest();
        return new Promise(function (resolve, reject) {
            req.onerror = function (e) {
                getLogger().error('Failed to send', json, e);
                _this.postHandle(-1, {});
                reject(new Error("Failed to send JSON. See console logs"));
            };
            req.onload = function () {
                _this.postHandle(req.status, req.response);
                if (req.status !== 200) {
                    getLogger().warn("Failed to send data to ".concat(url, " (#").concat(req.status, " - ").concat(req.statusText, ")"), json);
                    reject(new Error("Failed to send JSON. Error code: ".concat(req.status, ". See logs for details")));
                }
                resolve();
            };
            req.open('POST', url);
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(json);
            getLogger().debug('sending json', json);
        });
    };
    UsermavenClientImpl.prototype.postHandle = function (status, response) {
        if (this.cookiePolicy === 'strict' || this.cookiePolicy === 'comply') {
            if (status === 200) {
                var data = response;
                if (typeof response === 'string') {
                    data = JSON.parse(response);
                }
                if (!data['delete_cookie']) {
                    return;
                }
            }
            this.userIdPersistence.delete();
            this.propsPersistance.delete();
            deleteCookie(this.idCookieName);
        }
    };
    UsermavenClientImpl.prototype.getCtx = function () {
        var now = new Date();
        return __assign({ event_id: '', user: __assign({ anonymous_id: this.anonymousId }, this.userProperties), ids: this._getIds(), user_agent: navigator.userAgent, utc_time: reformatDate(now.toISOString()), local_tz_offset: now.getTimezoneOffset(), referer: document.referrer, url: window.location.href, page_title: document.title, doc_path: document.location.pathname, doc_host: document.location.hostname, doc_search: window.location.search, screen_resolution: screen.width + 'x' + screen.height, vp_size: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) + 'x' + Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0), user_language: navigator.language, doc_encoding: document.characterSet }, getDataFromParams(parseQuery()));
    };
    UsermavenClientImpl.prototype._getIds = function () {
        var cookies = getCookies(false);
        var res = {};
        for (var _i = 0, _a = Object.entries(cookies); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (this._3pCookies[key]) {
                res[key.charAt(0) == '_' ?
                    key.substr(1) :
                    key] = value;
            }
        }
        return res;
    };
    UsermavenClientImpl.prototype.track = function (type, payload) {
        var data = payload || {};
        getLogger().debug('track event of type', type, data);
        var e = this.makeEvent(type, this.compatMode ?
            'eventn' :
            'jitsu', payload || {});
        return this.sendJson(e);
    };
    UsermavenClientImpl.prototype.init = function (options) {
        var _this = this;
        var _a, _b;
        if (options.ip_policy) {
            this.ipPolicy = options.ip_policy;
        }
        if (options.cookie_policy) {
            this.cookiePolicy = options.cookie_policy;
        }
        if (options.privacy_policy === 'strict') {
            this.ipPolicy = 'strict';
            this.cookiePolicy = 'strict';
        }
        if (options.use_beacon_api && navigator.sendBeacon) {
            this.beaconApi = true;
        }
        //can't handle delete cookie response when beacon api
        if (this.cookiePolicy === 'comply' && this.beaconApi) {
            this.cookiePolicy = 'strict';
        }
        if (options.log_level) {
            setRootLogLevel(options.log_level);
        }
        this.initialOptions = options;
        getLogger().debug('Initializing Usermaven Tracker tracker', options, USERMAVEN_VERSION);
        if (!options.key) {
            getLogger().error('Can\'t initialize Usermaven, key property is not set');
            return;
        }
        this.compatMode = options.compat_mode === undefined ?
            defaultCompatMode :
            !!options.compat_mode;
        this.cookieDomain = options.cookie_domain || getCookieDomain();
        this.trackingHost = getHostWithProtocol(options['tracking_host'] || 't.usermaven.com');
        this.randomizeUrl = options.randomize_url || false;
        this.idCookieName = options.cookie_name || '__eventn_id';
        this.apiKey = options.key;
        if (this.cookiePolicy === 'strict') {
            this.propsPersistance = new NoPersistence();
        }
        else {
            this.propsPersistance = new CookiePersistence(this.cookieDomain, this.idCookieName + '_props');
        }
        if (this.cookiePolicy === 'strict') {
            this.userIdPersistence = new NoPersistence();
        }
        else {
            this.userIdPersistence = new CookiePersistence(this.cookieDomain, this.idCookieName + '_usr');
        }
        if (this.propsPersistance) {
            var restored = this.propsPersistance.restore();
            if (restored) {
                this.permanentProperties = restored;
                this.permanentProperties.globalProps = (_a = restored.globalProps) !== null && _a !== void 0 ? _a : {};
                this.permanentProperties.propsPerEvent = (_b = restored.propsPerEvent) !== null && _b !== void 0 ? _b : {};
            }
            getLogger().debug('Restored persistent properties', this.permanentProperties);
        }
        if (options.capture_3rd_party_cookies === false) {
            this._3pCookies = {};
        }
        else {
            (options.capture_3rd_party_cookies || ['_ga', '_fbp', '_ym_uid', 'ajs_user_id', 'ajs_anonymous_id'])
                .forEach(function (name) { return _this._3pCookies[name] = true; });
        }
        if (options.ga_hook) {
            getLogger().warn('GA event interceptor isn\'t supported anymore');
        }
        if (options.segment_hook) {
            interceptSegmentCalls(this);
        }
        if (this.cookiePolicy !== 'strict') {
            this.anonymousId = this.getAnonymousId();
        }
        this.initialized = true;
    };
    UsermavenClientImpl.prototype.interceptAnalytics = function (analytics) {
        var _this = this;
        var interceptor = function (chain) {
            var _a;
            try {
                var payload = __assign({}, chain.payload);
                getLogger().debug('Intercepted segment payload', payload.obj);
                var integration = chain.integrations['Segment.io'];
                if (integration && integration.analytics) {
                    var analyticsOriginal = integration.analytics;
                    if (typeof analyticsOriginal.user === 'function' && analyticsOriginal.user() && typeof analyticsOriginal.user().id === 'function') {
                        payload.obj.userId = analyticsOriginal.user().id();
                    }
                }
                if ((_a = payload === null || payload === void 0 ? void 0 : payload.obj) === null || _a === void 0 ? void 0 : _a.timestamp) {
                    payload.obj.sentAt = payload.obj.timestamp;
                }
                var type = chain.payload.type();
                if (type === 'track') {
                    type = chain.payload.event();
                }
                _this._send3p('ajs', payload, type);
            }
            catch (e) {
                getLogger().warn('Failed to send an event', e);
            }
            chain.next(chain.payload);
        };
        if (typeof analytics.addSourceMiddleware === 'function') {
            //analytics is fully initialized
            getLogger().debug('Analytics.js is initialized, calling addSourceMiddleware');
            analytics.addSourceMiddleware(interceptor);
        }
        else {
            getLogger().debug('Analytics.js is not initialized, pushing addSourceMiddleware to callstack');
            analytics.push(['addSourceMiddleware', interceptor]);
        }
        analytics['__en_intercepted'] = true;
    };
    UsermavenClientImpl.prototype.restoreId = function () {
        if (this.userIdPersistence) {
            var props = this.userIdPersistence.restore();
            if (props) {
                this.userProperties = __assign(__assign({}, props), this.userProperties);
            }
        }
    };
    UsermavenClientImpl.prototype.set = function (properties, opts) {
        var _a;
        var eventType = opts === null || opts === void 0 ? void 0 : opts.eventType;
        var persist = (opts === null || opts === void 0 ? void 0 : opts.persist) === undefined || (opts === null || opts === void 0 ? void 0 : opts.persist);
        if (eventType !== undefined) {
            var current = (_a = this.permanentProperties.propsPerEvent[eventType]) !== null && _a !== void 0 ? _a : {};
            this.permanentProperties.propsPerEvent[eventType] = __assign(__assign({}, current), properties);
        }
        else {
            this.permanentProperties.globalProps = __assign(__assign({}, this.permanentProperties.globalProps), properties);
        }
        if (this.propsPersistance && persist) {
            this.propsPersistance.save(this.permanentProperties);
        }
    };
    UsermavenClientImpl.prototype.unset = function (propertyName, opts) {
        var eventType = opts === null || opts === void 0 ? void 0 : opts.eventType;
        var persist = (opts === null || opts === void 0 ? void 0 : opts.persist) === undefined || (opts === null || opts === void 0 ? void 0 : opts.persist);
        if (!eventType) {
            delete this.permanentProperties.globalProps[propertyName];
        }
        else if (this.permanentProperties.propsPerEvent[eventType]) {
            delete this.permanentProperties.propsPerEvent[eventType][propertyName];
        }
        if (this.propsPersistance && persist) {
            this.propsPersistance.save(this.permanentProperties);
        }
    };
    return UsermavenClientImpl;
}());
function interceptSegmentCalls(t) {
    var win = window;
    if (!win.analytics) {
        win.analytics = [];
    }
    t.interceptAnalytics(win.analytics);
}

export { usermavenClient };
