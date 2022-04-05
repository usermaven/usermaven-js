import { getLogger } from './log';
import { UsermavenClient, UsermavenFunction, UsermavenOptions } from './interface';
import { usermavenClient } from './usermaven';

const jsFileName = "lib.js"
//Make sure that all properties form UsermavenOptions are listed here
const usermavenProps = [
  'use_beacon_api', 'cookie_domain', 'tracking_host', 'cookie_name',
  'key', 'ga_hook', 'segment_hook', 'randomize_url', 'capture_3rd_party_cookies',
  'id_method', 'log_level', 'compat_mode', 'privacy_policy', 'cookie_policy', 'ip_policy',
  'persistence', 'persistence_name', "project_id", "cross_subdomain_cookie",
  'persistence_time', 'disable_persistence', 'autocapture', 'capture_pageview',
  'properties_string_max_length', 'property_blacklist'
];

function getTrackingHost(scriptSrc: string): string {
  return scriptSrc.replace("/s/" + jsFileName, "").replace("/" + jsFileName, "");
}
const supressInterceptionWarnings = "data-suppress-interception-warning";

function hookWarnMsg(hookType: string) {
  return `
      ATTENTION! ${hookType}-hook set to true along with defer/async attribute! If ${hookType} code is inserted right after Usermaven tag,
      first tracking call might not be intercepted! Consider one of the following:
       - Inject usermaven tracking code without defer/async attribute
       - If you're sure that events won't be sent to ${hookType} before Usermaven is fully initialized, set ${supressInterceptionWarnings}="true"
       script attribute
    `;
}

function getTracker(window): UsermavenClient {

  let script = document.currentScript
    || document.querySelector('script[src*=jsFileName][data-usermaven-api-key]');

  if (!script) {
    getLogger().warn("Usermaven script is not properly initialized. The definition must contain data-usermaven-api-key as a parameter")
    return undefined;
  }
  let opts: UsermavenOptions = {
    tracking_host: getTrackingHost(script.getAttribute('src')),
    key: null
  };

  usermavenProps.forEach(prop => {
    let attr = "data-" + prop.replace("_", "-");
    if (script.getAttribute(attr) !== undefined && script.getAttribute(attr) !== null) {
      let val: any = script.getAttribute(attr);
      if ("true" === val) {
        val = true;
      } else if ("false" === val) {
        val = false;
      }
      opts[prop] = val;
    }
  })
  window.usermavenClient = usermavenClient(opts)
  if (opts.segment_hook && (script.getAttribute('defer') !== null || script.getAttribute('async') !== null) && script.getAttribute(supressInterceptionWarnings) === null) {
    getLogger().warn(hookWarnMsg("segment"))
  }
  if (opts.ga_hook && (script.getAttribute('defer') !== null || script.getAttribute('async') !== null) && script.getAttribute(supressInterceptionWarnings) === null) {
    getLogger().warn(hookWarnMsg("ga"))
  }

  const usermaven: UsermavenFunction = function () {
    let queue = window.usermavenQ = window.usermavenQ || [];
    queue.push(arguments)
    processQueue(queue, window.usermavenClient);
  }
  window.usermaven = usermaven;
  console.log(opts)
  if(opts.project_id){
    // @ts-ignore
    usermaven('set', { "project_id": opts.project_id })
  }

  if ("true" !== script.getAttribute("data-init-only") && "yes" !== script.getAttribute("data-init-only")) {
    if (!Object.keys(opts).includes('capture_pageview') || opts['capture_pageview']) {
      usermaven('track', 'pageview');
    }
  }
  return window.usermavenClient;
}

function processQueue(queue: any[], usermavenInstance: UsermavenClient) {
  getLogger().debug("Processing queue", queue);
  for (let i = 0; i < queue.length; i += 1) {
    const [methodName, ...args] = ([...queue[i]] || []);
    const method = (usermavenInstance as any)[methodName];
    if (typeof method === 'function') {
      method.apply(usermavenInstance, args);
    }
  }
  queue.length = 0;
}

if (window) {
  let win = window as any;
  let tracker = getTracker(win);
  if (tracker) {
    getLogger().debug("Usermaven in-browser tracker has been initialized")
    win.usermaven = function () {
      let queue = win.usermavenQ = win.usermavenQ || [];
      queue.push(arguments)
      processQueue(queue, tracker);
    }
    if (win.usermavenQ) {
      getLogger().debug(`Initial queue size of ${win.usermavenQ.length} will be processed`);
      processQueue(win.usermavenQ, tracker);
    }
  } else {
    getLogger().error("Usermaven tracker has not been initialized (reason unknown)")
  }
} else {
  getLogger().warn("Usermaven tracker called outside browser context. It will be ignored")
}