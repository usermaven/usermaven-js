import {getLogger} from './log';
import {UsermavenClient, UsermavenFunction, UsermavenOptions} from './interface';
import {usermavenClient} from './usermaven';

const jsFileName = "lib.js"
//Make sure that all properties form UsermavenOptions are listed here
const usermavenProps = [
    'use_beacon_api', 'cookie_domain', 'tracking_host', 'cookie_name',
    'key', 'ga_hook', 'segment_hook', 'randomize_url', 'capture_3rd_party_cookies',
    'id_method', 'log_level', 'compat_mode', 'privacy_policy', 'cookie_policy', 'ip_policy',
    'custom_headers', 'force_use_fetch', 'min_send_timeout', 'max_send_timeout', 'max_send_attempts', 'disable_event_persistence',
    'project_id', 'autocapture', 'properties_string_max_length', 'property_blacklist',
    'exclude', 'auto_pageview', 'namespace'
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

    let script = document.currentScript;

    if (!script) {
        getLogger().warn("Usermaven script is not properly initialized. The definition must contain data-usermaven-api-key as a parameter")
        return undefined;
    }
    let opts: UsermavenOptions = {
        tracking_host: getTrackingHost(script.getAttribute('src')),
        key: null
    };

    const NAMESPACE = script.getAttribute('data-namespace') || 'usermaven';


    usermavenProps.forEach(prop => {
        let attr = "data-" + prop.replace(new RegExp("_", "g"), "-");
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
    const usermavenClientKey = `${NAMESPACE}Client`;

    window[usermavenClientKey] = usermavenClient(opts)
    if (opts.segment_hook && (script.getAttribute('defer') !== null || script.getAttribute('async') !== null) && script.getAttribute(supressInterceptionWarnings) === null) {
        getLogger().warn(hookWarnMsg("segment"))
    }
    if (opts.ga_hook && (script.getAttribute('defer') !== null || script.getAttribute('async') !== null) && script.getAttribute(supressInterceptionWarnings) === null) {
        getLogger().warn(hookWarnMsg("ga"))
    }


    // Save these variables to local scope, so they don't get overwritten
    let currentNamespace = NAMESPACE, currentUsermavenClientKey = usermavenClientKey;

    ((NAMESPACE, usermavenClientKey, script) => {

        const usermaven = function () {
            let queue = window[NAMESPACE + "Q"] = window[NAMESPACE + "Q"] || [];
            queue.push(arguments);
            processQueue(queue, window[usermavenClientKey]);
        };

        window[NAMESPACE] = usermaven;

        // Once our function is set, remove the script,
        // so we can handle the next script tag similarly
        script.parentNode.removeChild(script);

    })(currentNamespace, currentUsermavenClientKey, script);

    // Below usermaven project id set is deprecated.
    // TODO: remove soon.
    if (opts.project_id) {
        // @ts-ignore
        window[NAMESPACE]('set', {"project_id": opts.project_id})
    }

    if ("true" !== script.getAttribute("data-init-only") && "yes" !== script.getAttribute("data-init-only")) {
        window[NAMESPACE]('track', 'pageview');
    }


    let eventName = (typeof(window.onpagehide) === 'undefined') ? 'unload' : 'pagehide';

    window.addEventListener(eventName, function () {
        window[NAMESPACE]('track', '$pageleave');
    });

    return window[usermavenClientKey];
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

// Encapsulate the logic of your script within a self-executing function that accepts a namespace as an argument
((namespace) => {
    if (window) {
        let win = window as any;
        const NAMESPACE = namespace;
        let tracker = getTracker(win);
        if (tracker) {
            getLogger().debug("Usermaven in-browser tracker has been initialized", NAMESPACE)
            win[NAMESPACE] = function () {
                let queue = win[NAMESPACE + "Q"] = win[NAMESPACE + "Q"] || [];
                queue.push(arguments)
                processQueue(queue, tracker);
            }
            if (win[NAMESPACE + "Q"]) {
                getLogger().debug(`Initial queue size of ${win[NAMESPACE + "Q"].length} will be processed`);
                processQueue(win[NAMESPACE + "Q"], tracker);
            }
        } else {
            getLogger().error("Usermaven tracker has not been initialized (reason unknown)")
        }
    } else {
        getLogger().warn("Usermaven tracker called outside browser context. It will be ignored")
    }
})(document.currentScript.getAttribute('data-namespace') || 'usermaven');