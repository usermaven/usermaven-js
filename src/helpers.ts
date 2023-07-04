import { isWindowAvailable, requireWindow } from "./window";
import { CookieOpts, serializeCookie } from "./cookie";
import {getLogger} from "./log";
// Courtesy: https://stackoverflow.com/a/23945027
function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("//") > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

// Warning: you can use this function to extract the "root" domain, but it will not be as accurate as using the psl package. 
// https://www.npmjs.com/package/psl
const  extractRootDomain = (url) => {
  let domain = extractHostname(url),
  splitArr = domain.split('.'),
  arrLen = splitArr.length;

  // extracting the root domain here
  // if there is a subdomain
  if (arrLen > 2) {
    if (splitArr[arrLen - 1].length == 2) {
      // likely a ccTLD
      domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
      // if the second level domain is also two letters (like co.uk), include the next part up
      if (splitArr[arrLen - 2].length == 2) {
        domain = splitArr[arrLen - 3] + '.' + domain;
      }
    } else {
      // likely a gTLD
      domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    }
  }
  return domain;
}

const extractTopLevelDomain = (url) => {
  const DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]+\.[a-z.]{2,6}$/i
    const matches = url.match(DOMAIN_MATCH_REGEX),
        domain = matches ? matches[0] : ''

    return domain
}

export const extractRoot = (url) => {

    const domainParts = url.split(".");
    const domainLength = domainParts.length;

    // Check if it's an IP address
    if (domainLength === 4 && domainParts.every(part => !isNaN(part))) {
        return url;
    }

    let rootDomain = extractTopLevelDomain(url);
    if (!rootDomain) { // If it's not a top level domain, use a fallback method
      rootDomain = extractRootDomain(url);
    }

    return rootDomain;
}

export const getCookieDomain = () => {
  if (isWindowAvailable()) {
    // const domain = window.location.hostname.replace("www.", "")
    //
    // // Check if subdomain is set, if yes, we remove the subdomain from the cookie domain and return the root domain with a leading dot
    // // This is to ensure that cookies are set correctly for cross domain tracking
    // const subdomain = domain.split('.')[0]
    // if (subdomain) {
    //   return '.' + extractRootDomain(domain)
    // }

    return extractRoot(window.location.hostname);
  }
  return undefined;
};

let cookieParsingCache: Record<string, string>;
export function parseCookieString(cookieStr?: string) {
  if (!cookieStr) {
    return {};
  }
  let res: Record<string, string> = {};
  let cookies = cookieStr.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    let idx = cookie.indexOf("=");
    if (idx > 0) {
      res[cookie.substr(i > 0 ? 1 : 0, i > 0 ? idx - 1 : idx)] = cookie.substr(
        idx + 1
      );
    }
  }
  return res;
}


function copyAttributes(source: HTMLElement, target: HTMLElement) {
  return Array.from(source.attributes).forEach((attribute) => {
    target.setAttribute(attribute.nodeName, attribute.nodeValue);
  });
}

export function insertAndExecute(element: HTMLElement, html: string) {
  element.innerHTML = html;
  let scripts = element.getElementsByTagName("script");
  let index;
  for (index = scripts.length - 1; index >= 0; index--) {
    const script = scripts[index];
    const tag = document.createElement("script");
    copyAttributes(script, tag);
    if (script.innerHTML) {
      tag.innerHTML = script.innerHTML;
    }
    tag.setAttribute("data-usermaven-tag-id", element.id);
    document.getElementsByTagName("head")[0].appendChild(tag);
    scripts[index].parentNode.removeChild(scripts[index]);
  }
}

export const getCookies = (
  useCache: boolean = false
): Record<string, string> => {
  if (useCache && cookieParsingCache) {
    return cookieParsingCache;
  }

  let res = parseCookieString(document.cookie);
  cookieParsingCache = res;
  return res;
};

// Methods partially borrowed from quirksmode.org/js/cookies.html
export const getCookie = (name: string) => {
  if (!name) {
    return null;
  }
  try {
    const nameEQ = name + '='
    const ca = requireWindow().document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length)
      }
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length))
      }
    }
  } catch (err) {
    getLogger().error("getCookies", err);
  }
  return null
};

export const setCookie = (
  name: string,
  value: string,
  opts: CookieOpts = {}
) => {
  requireWindow().document.cookie = serializeCookie(name, value, opts);
};

export const deleteCookie = (name: string, path: string | undefined = "/") => {
    document.cookie = name + "= ; SameSite=Strict; expires = Thu, 01 Jan 1970 00:00:00 GMT" + (path ? ("; path = " + path) : "");
};

export const generateId = () => Math.random().toString(36).substring(2, 12);

export const generateRandom = () => Math.random().toString(36).substring(2, 7);

export const parseQuery = (qs: string) => {
  if (!qs) {
    return {};
  }
  let queryString =
    qs.length > 0 && qs.charAt(0) === "?" ? qs.substring(1) : qs;
  let query: Record<string, string> = {};
  let pairs = (
    queryString[0] === "?" ? queryString.substr(1) : queryString
  ).split("&");
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
};

const UTM_TYPES: Record<string, string> = {
  utm_source: "source",
  utm_medium: "medium",
  utm_campaign: "campaign",
  utm_term: "term",
  utm_content: "content"
};

const CLICK_IDS: Record<string, boolean> = {
  gclid: true,
  fbclid: true,
  dclid: true
};

export const getDataFromParams = (params: Record<string, string>) => {
  const result = {
    utm: {} as Record<string, string>,
    click_id: {} as Record<string, any>,
  };
  for (let name in params) {
    if (!params.hasOwnProperty(name)) {
      continue;
    }
    const val = params[name];
    const utm = UTM_TYPES[name];
    if (utm) {
      result.utm[utm] = val;
    } else if (CLICK_IDS[name]) {
      result.click_id[name] = val;
    }
  }
  return result;
};

//2020-08-24T13:42:16.439Z -> 2020-08-24T13:42:16.439123Z
export const reformatDate = (strDate: string) => {
  const end = strDate.split(".")[1];
  if (!end) {
    return strDate;
  }
  if (end.length >= 7) {
    return strDate;
  }
  return strDate.slice(0, -1) + "0".repeat(7 - end.length) + "Z";
};

function endsWith(str: string, suffix: string) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

export const getHostWithProtocol = (host: string) => {
  while (endsWith(host, "/")) {
    host = host.substr(0, host.length - 1);
  }
  if (host.indexOf("https://") === 0 || host.indexOf("http://") === 0) {
    return host;
  } else {
    return "https://" + host;
  }
};

export function awaitCondition<T>(
  condition: () => boolean,
  factory: () => T,
  timeout = 500,
  retries = 4
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (condition()) {
      resolve(factory());
      return;
    }
    if (retries === 0) {
      reject("condition rejected");
      return;
    }
    setTimeout(() => {
      awaitCondition(condition, factory, timeout, retries - 1)
        .then(resolve)
        .catch(reject);
    }, timeout);
  });
}


