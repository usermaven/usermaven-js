import {
  deleteCookie,
  generateId,
  generateRandom,
  getCookie,
  getCookieDomain,
  getCookies,
  getDataFromParams,
  getHostWithProtocol,
  parseQuery,
  reformatDate,
  setCookie
} from './helpers'
import {
  Event,
  EventCompat,
  EventCtx,
  EventPayload,
  EventSrc,
  UsermavenClient,
  UsermavenOptions,
  Policy,
  Transport,
  UserProps
} from './interface'
import { getLogger, setRootLogLevel } from './log';
import { UserMavenPersistence } from './session/usermaven-persistence';
import { SessionIdManager } from './session/sessionid';
import { autocapture } from './autocapture/autocapture';
import { _, userAgent } from "./utils"

const VERSION_INFO = {
  env: '__buildEnv__',
  date: '__buildDate__',
  version: '__buildVersion__'
}

const USERMAVEN_VERSION = `${VERSION_INFO.version}/${VERSION_INFO.env}@${VERSION_INFO.date}`;

const beaconTransport: Transport = (url: string, json: string): Promise<void> => {
  getLogger().debug('Sending beacon', json);
  const blob = new Blob([json], { type: 'text/plain' });
  navigator.sendBeacon(url, blob);
  return Promise.resolve();
}

interface Persistence {
  save(props: Record<string, any>)
  restore(): Record<string, any> | undefined
  delete()
}

class CookiePersistence implements Persistence {
  private cookieDomain: string;
  private cookieName: string;

  constructor(cookieDomain: string, cookieName: string) {
    this.cookieDomain = cookieDomain;
    this.cookieName = cookieName;
  }

  public save(props: Record<string, any>) {
    setCookie(this.cookieName, encodeURIComponent(JSON.stringify(props)), Infinity, this.cookieDomain, document.location.protocol !== 'http:');
  }

  restore(): Record<string, any> | undefined {
    let str = getCookie(this.cookieName);
    if (str) {
      try {
        const parsed = JSON.parse(decodeURIComponent(str));
        if (typeof parsed !== 'object') {
          getLogger().warn(`Can't restore value of ${this.cookieName}@${this.cookieDomain}, expected to be object, but found ${typeof parsed !== 'object'}: ${parsed}. Ignoring`)
          return undefined;
        }
        return parsed;
      } catch (e) {
        getLogger().error('Failed to decode JSON from ' + str, e);
        return undefined;
      }
    }
    return undefined;
  }

  delete() {
    deleteCookie(this.cookieName)
  }
}

class NoPersistence implements Persistence {
  public save(props: Record<string, any>) {
  }

  restore(): Record<string, any> | undefined {
    return undefined;
  }

  delete() { }
}

const defaultCompatMode = false;

export function usermavenClient(opts?: UsermavenOptions): UsermavenClient {
  let client = new UsermavenClientImpl();
  client.init(opts);
  return client;
}

type PermanentProperties = {
  globalProps: Record<string, any>
  propsPerEvent: Record<string, Record<string, any>>
}

class UsermavenClientImpl implements UsermavenClient {
  public config?: any;
  public persistence?: UserMavenPersistence;
  public sessionManager?: SessionIdManager;

  private userIdPersistence?: Persistence;
  private propsPersistance?: Persistence;

  private anonymousId: string = '';
  private userProperties: UserProps = {}
  private permanentProperties: PermanentProperties = { globalProps: {}, propsPerEvent: {} }
  private cookieDomain: string = '';
  private trackingHost: string = '';
  private idCookieName: string = '';
  private randomizeUrl: boolean = false;

  private apiKey: string = '';
  private initialized: boolean = false;
  private _3pCookies: Record<string, boolean> = {};
  private initialOptions?: UsermavenOptions;
  private compatMode: boolean;
  private cookiePolicy: Policy = 'keep';
  private ipPolicy: Policy = 'keep';
  private beaconApi: boolean = false;
  public __autocapture_enabled = false;

  get_config(prop_name) {
    return this.config ? this.config[prop_name] : null
  }

  id(props: UserProps, doNotSendEvent?: boolean): Promise<void> {
    this.userProperties = { ...this.userProperties, ...props }
    getLogger().debug('Usermaven user identified', props)

    if (this.userIdPersistence) {
      this.userIdPersistence.save(props);
    } else {
      getLogger().warn('Id() is called before initialization')
    }
    if (!doNotSendEvent) {
      return this.track('user_identify', {});
    } else {
      return Promise.resolve();
    }
  }

  rawTrack(payload: any) {
    this.sendJson(payload);
  };

  getAnonymousId() {
    const idCookie = getCookie(this.idCookieName);
    if (idCookie) {
      getLogger().debug('Existing user id', idCookie);
      return idCookie;
    }
    let newId = generateId();
    getLogger().debug('New user id', newId);
    setCookie(this.idCookieName, newId, Infinity, this.cookieDomain, document.location.protocol !== 'http:');
    return newId;
  }

  makeEvent(event_type: string, src: EventSrc, payload: EventPayload): Event | EventCompat {
    this.restoreId();
    let context = this.getCtx();
    let persistentProps = {
      ...this.permanentProperties.globalProps,
      ...(this.permanentProperties.propsPerEvent[event_type] ?? {}),
    }
    let base = {
      api_key: this.apiKey,
      src,
      event_type,
      ...payload
    }

    return this.compatMode ?
      { ...persistentProps, eventn_ctx: context, ...base } :
      { ...persistentProps, ...context, ...base };
  }

  _send3p(sourceType: EventSrc, object: any, type?: string): Promise<any> {
    let eventType = '3rdparty'
    if (type && type !== '') {
      eventType = type
    }

    const e = this.makeEvent(eventType, sourceType, {
      src_payload: object
    });
    return this.sendJson(e);
  }

  sendJson(json: any): Promise<void> {
    let cookiePolicy = this.cookiePolicy !== 'keep' ? `&cookie_policy=${this.cookiePolicy}` : ''
    let ipPolicy = this.ipPolicy !== 'keep' ? `&ip_policy=${this.ipPolicy}` : ''
    let url = `${this.trackingHost}/api/v1/event?token=${this.apiKey}${cookiePolicy}${ipPolicy}`;
    if (this.randomizeUrl) {
      url = `${this.trackingHost}/api.${generateRandom()}?p_${generateRandom()}=${this.apiKey}${cookiePolicy}${ipPolicy}`;
    }
    let jsonString = JSON.stringify(json);
    if (this.beaconApi) {
      return beaconTransport(url, jsonString);
    } else {
      return this.xmlHttpReqTransport(url, jsonString)
    }
  }

  xmlHttpReqTransport(url: string, json: string): Promise<void> {
    let req = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
      req.onerror = (e) => {
        getLogger().error('Failed to send', json, e);
        this.postHandle(-1, {})
        reject(new Error(`Failed to send JSON. See console logs`))
      };
      req.onload = () => {
        this.postHandle(req.status, req.response)
        if (req.status !== 200) {
          getLogger().warn(`Failed to send data to ${url} (#${req.status} - ${req.statusText})`, json);
          reject(new Error(`Failed to send JSON. Error code: ${req.status}. See logs for details`))
        }
        resolve();
      }
      req.open('POST', url);
      req.setRequestHeader('Content-Type', 'application/json');
      req.send(json)
      getLogger().debug('sending json', json);
    });
  }

  postHandle(status: number, response: any): any {
    if (this.cookiePolicy === 'strict' || this.cookiePolicy === 'comply') {
      if (status === 200) {
        let data = response;
        if (typeof response === 'string') {
          data = JSON.parse(response);
        }
        if (!data['delete_cookie']) {
          return
        }
      }
      this.userIdPersistence.delete()
      this.propsPersistance.delete()
      deleteCookie(this.idCookieName)
    }
  }

  getCtx(): EventCtx {
    let now = new Date();
    return {
      event_id: '', //generate id on the backend side
      ...this.sessionManager.getSessionAndWindowId(),
      user: {
        anonymous_id: this.anonymousId,
        ...this.userProperties
      },
      ids: this._getIds(),
      user_agent: navigator.userAgent,
      utc_time: reformatDate(now.toISOString()),
      local_tz_offset: now.getTimezoneOffset(),
      referer: document.referrer,
      url: window.location.href,
      page_title: document.title,
      doc_path: document.location.pathname,
      doc_host: document.location.hostname,
      doc_search: window.location.search,
      screen_resolution: screen.width + 'x' + screen.height,
      vp_size: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) + 'x' + Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
      user_language: navigator.language,
      doc_encoding: document.characterSet,
      ...getDataFromParams(parseQuery())
    };
  }

  private _getIds(): Record<string, string> {
    let cookies = getCookies(false);
    let res: Record<string, string> = {};
    for (let [key, value] of Object.entries(cookies)) {
      if (this._3pCookies[key]) {
        res[key.charAt(0) == '_' ?
          key.substr(1) :
          key] = value;
      }
    }
    return res;
  }

  track(type: string, payload?: EventPayload): Promise<void> {
    let data = payload || {};
    getLogger().debug('track event of type', type, data)
    const e = this.makeEvent(type, this.compatMode ?
      'eventn' :
      'usermaven', payload || {});
    return this.sendJson(e);
  }

  init(options: UsermavenOptions) {
    if (options.ip_policy) {
      this.ipPolicy = options.ip_policy
    }
    if (options.cookie_policy) {
      this.cookiePolicy = options.cookie_policy
    }
    if (options.privacy_policy === 'strict') {
      this.ipPolicy = 'strict'
      this.cookiePolicy = 'strict'
    }
    if (options.use_beacon_api && navigator.sendBeacon) {
      this.beaconApi = true
    }

    //can't handle delete cookie response when beacon api
    if (this.cookiePolicy === 'comply' && this.beaconApi) {
      this.cookiePolicy = 'strict'
    }
    if (options.log_level) {
      setRootLogLevel(options.log_level);
    }
    this.initialOptions = options;
    getLogger().debug('Initializing Usermaven Tracker tracker', options, USERMAVEN_VERSION)
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
    } else {
      this.propsPersistance = new CookiePersistence(this.cookieDomain, this.idCookieName + '_props');
    }

    if (this.cookiePolicy === 'strict') {
      this.userIdPersistence = new NoPersistence();
    } else {
      this.userIdPersistence = new CookiePersistence(this.cookieDomain, this.idCookieName + '_usr');
    }

    if (this.propsPersistance) {
      const restored = this.propsPersistance.restore();
      if (restored) {
        this.permanentProperties = restored as PermanentProperties;
        this.permanentProperties.globalProps = restored.globalProps ?? {};
        this.permanentProperties.propsPerEvent = restored.propsPerEvent ?? {};
      }
      getLogger().debug('Restored persistent properties', this.permanentProperties);
    }

    const defaultConfig = {
      persistence: 'cookie',
      persistence_name: 'session',
      autocapture: false,
      capture_pageview: true,
      store_google: true,
      save_referrer: true,
      properties_string_max_length: null, // 65535
      property_blacklist: [],
      sanitize_properties: null
    }
    this.config = _.extend({}, defaultConfig, options || {}, this.config || {}, { token: this.apiKey })

    getLogger().debug('Default Configuration', this.config);
    this.manageSession(options);

    this.manageAutoCapture(options);

    if (options.capture_3rd_party_cookies === false) {
      this._3pCookies = {}
    } else {
      (options.capture_3rd_party_cookies || ['_ga', '_fbp', '_ym_uid', 'ajs_user_id', 'ajs_anonymous_id'])
        .forEach(name => this._3pCookies[name] = true)
    }

    if (options.ga_hook) {
      getLogger().warn('GA event interceptor isn\'t supported anymore')
    }
    if (options.segment_hook) {
      interceptSegmentCalls(this);
    }
    if (this.cookiePolicy !== 'strict') {
      this.anonymousId = this.getAnonymousId();
    }
    this.initialized = true;

    // Set up the window close event handler "unload"
    window.addEventListener && window.addEventListener('unload', this._handle_unload.bind(this))
  }

  interceptAnalytics(analytics: any) {
    let interceptor = (chain: any) => {
      try {
        let payload = { ...chain.payload }
        getLogger().debug('Intercepted segment payload', payload.obj);

        let integration = chain.integrations['Segment.io']
        if (integration && integration.analytics) {
          let analyticsOriginal = integration.analytics
          if (typeof analyticsOriginal.user === 'function' && analyticsOriginal.user() && typeof analyticsOriginal.user().id === 'function') {
            payload.obj.userId = analyticsOriginal.user().id()
          }
        }
        if (payload?.obj?.timestamp) {
          payload.obj.sentAt = payload.obj.timestamp;
        }

        let type = chain.payload.type();
        if (type === 'track') {
          type = chain.payload.event()
        }

        this._send3p('ajs', payload, type);
      } catch (e) {
        getLogger().warn('Failed to send an event', e)
      }

      chain.next(chain.payload);
    };
    if (typeof analytics.addSourceMiddleware === 'function') {
      //analytics is fully initialized
      getLogger().debug('Analytics.js is initialized, calling addSourceMiddleware');
      analytics.addSourceMiddleware(interceptor);
    } else {
      getLogger().debug('Analytics.js is not initialized, pushing addSourceMiddleware to callstack');
      analytics.push(['addSourceMiddleware', interceptor])
    }
    analytics['__en_intercepted'] = true
  }

  private restoreId() {
    if (this.userIdPersistence) {
      let props = this.userIdPersistence.restore();
      if (props) {
        this.userProperties = { ...props, ...this.userProperties };
      }
    }
  }

  set(properties, opts?) {
    const eventType = opts?.eventType;
    const persist = opts?.persist === undefined || opts?.persist
    if (eventType !== undefined) {
      let current = this.permanentProperties.propsPerEvent[eventType] ?? {};
      this.permanentProperties.propsPerEvent[eventType] = { ...current, ...properties };
    } else {
      this.permanentProperties.globalProps = { ...this.permanentProperties.globalProps, ...properties };
    }

    if (this.propsPersistance && persist) {
      this.propsPersistance.save(this.permanentProperties);
    }
  }

  unset(propertyName: string, opts) {
    const eventType = opts?.eventType;
    const persist = opts?.persist === undefined || opts?.persist

    if (!eventType) {
      delete this.permanentProperties.globalProps[propertyName];
    } else if (this.permanentProperties.propsPerEvent[eventType]) {
      delete this.permanentProperties.propsPerEvent[eventType][propertyName];
    }
    if (this.propsPersistance && persist) {
      this.propsPersistance.save(this.permanentProperties);
    }
    if (this.sessionManager) {
      this.sessionManager.resetSessionId();
    }
  }

  /**
   * Manage session capability
   * @param options 
   */
  manageSession(options: UsermavenOptions) {
    this.persistence = new UserMavenPersistence(this.config)
    getLogger().debug('Persistence Configuration', this.persistence);
    this.sessionManager = new SessionIdManager(this.config, this.persistence)
    getLogger().debug('Session Configuration', this.sessionManager);
  }

  /**
   * Manage auto-capturing
   * @param options 
   */
  manageAutoCapture(options: UsermavenOptions) {
    getLogger().debug("Auto Capture Status: ", this.config['autocapture']);
    this.__autocapture_enabled = this.config['autocapture'];
    if (!this.__autocapture_enabled) { return }

    var num_buckets = 100
    var num_enabled_buckets = 100
    if (!autocapture.enabledForProject(this.apiKey, num_buckets, num_enabled_buckets)) {
      this.config['autocapture'] = false
      console.log('Not in active bucket: disabling Automatic Event Collection.')
    } else if (!autocapture.isBrowserSupported()) {
      this.config['autocapture'] = false
      console.log('Disabling Automatic Event Collection because this browser is not supported')
    } else {
      autocapture.init(this)
    }
  }

  /**
 * Capture an event. This is the most important and
 * frequently used usermaven function.
 *
 * ### Usage:
 *
 *     // capture an event named 'Registered'
 *     usermaven.capture('Registered', {'Gender': 'Male', 'Age': 21});
 *
 *     // capture an event using navigator.sendBeacon
 *     usermaven.capture('Left page', {'duration_seconds': 35}, {transport: 'sendBeacon'});
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
    if (_.isUndefined(event_name) || typeof event_name !== 'string') {
      console.error('No event name provided to posthog.capture')
      return
    }

    if (_.isBlockedUA(userAgent)) {
      return
    }

    const start_timestamp = this['persistence'].remove_event_timer(event_name)

    // update persistence
    this['persistence'].update_search_keyword(document.referrer)

    if (this.get_config('store_google')) {
      this['persistence'].update_campaign_params()
    }
    if (this.get_config('save_referrer')) {
      this['persistence'].update_referrer_info(document.referrer)
    }

    var data = {
      event: event_name + (properties['$event_type'] ? '_' + properties['$event_type'] : ''),
      properties: this._calculate_event_properties(event_name, properties, start_timestamp),
    }

    data = _.copyAndTruncateStrings(data, this.get_config('properties_string_max_length'))
    this.track(data.event, data.properties)
  }

  _calculate_event_properties(event_name, event_properties, start_timestamp) {
    // set defaults
    let properties = event_properties || {}

    if (event_name === '$snapshot') {
      return properties
    }

    // set $duration if time_event was previously called for this event
    if (!_.isUndefined(start_timestamp)) {
      var duration_in_ms = new Date().getTime() - start_timestamp
      properties['$duration'] = parseFloat((duration_in_ms / 1000).toFixed(3))
    }

    // note: extend writes to the first object, so lets make sure we
    // don't write to the persistence properties object and info
    // properties object by passing in a new object

    // update properties with pageview info and super-properties
    // exlude , _.info.properties()
    properties = _.extend({}, this['persistence'].properties(), properties)

    var property_blacklist = this.get_config('property_blacklist')
    if (_.isArray(property_blacklist)) {
      _.each(property_blacklist, function (blacklisted_prop) {
        delete properties[blacklisted_prop]
      })
    } else {
      console.error('Invalid value for property_blacklist config: ' + property_blacklist)
    }

    var sanitize_properties = this.get_config('sanitize_properties')
    if (sanitize_properties) {
      properties = sanitize_properties(properties, event_name)
    }

    // assign first element from $elements only
    let attributes = {};
    const elements = properties['$elements'] || []
    if (elements.length) {
      attributes = elements[0];
    }

    properties['attributes'] = attributes;
    delete properties['$ce_version'];
    delete properties['$event_type'];
    delete properties['$initial_referrer'];
    delete properties['$initial_referring_domain'];
    delete properties['$referrer'];
    delete properties['$referring_domain'];
    delete properties['$elements'];

    return properties
  }

  _handle_unload() {
    if (this.get_config('capture_pageview')) {
      this.capture('$pageleave')
    }
  }
}

function interceptSegmentCalls(t: UsermavenClient) {
  let win = window as any;
  if (!win.analytics) {
    win.analytics = [];
  }
  t.interceptAnalytics(win.analytics);
}
