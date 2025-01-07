'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sdkJs = require('@usermaven/sdk-js');
var runtimeCore = require('@vue/runtime-core');

function createClient(params) {
    return sdkJs.usermavenClient(params);
}

var USERMAVEN_INJECTION_KEY$1 = 'usermaven';
function useUsermaven() {
    var usermaven = runtimeCore.inject(USERMAVEN_INJECTION_KEY$1);
    if (!usermaven) {
        throw new Error('Usermaven instance not found. Make sure to use UsermavenPlugin.');
    }
    return usermaven;
}

/******************************************************************************
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

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// Composable to track URL changes
function useUrlChange() {
    var url = runtimeCore.ref(window.location.href);
    var lastUrl = runtimeCore.ref(window.location.href);
    var originalPushState = runtimeCore.ref();
    var originalReplaceState = runtimeCore.ref();
    var handleUrlChange = function () {
        var currentUrl = window.location.href;
        if (currentUrl !== lastUrl.value) {
            lastUrl.value = currentUrl;
            url.value = currentUrl;
        }
    };
    runtimeCore.onMounted(function () {
        window.addEventListener('popstate', handleUrlChange);
        // Store original history methods
        originalPushState.value = window.history.pushState;
        originalReplaceState.value = window.history.replaceState;
        // Override history methods
        window.history.pushState = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (originalPushState.value) {
                originalPushState.value.apply(window.history, args);
            }
            handleUrlChange();
        };
        window.history.replaceState = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (originalReplaceState.value) {
                originalReplaceState.value.apply(window.history, args);
            }
            handleUrlChange();
        };
    });
    runtimeCore.onUnmounted(function () {
        window.removeEventListener('popstate', handleUrlChange);
        if (originalPushState.value && originalReplaceState.value) {
            window.history.pushState = originalPushState.value;
            window.history.replaceState = originalReplaceState.value;
        }
    });
    return url;
}
// usePageView composable
function usePageView(opts) {
    if (opts === void 0) { opts = {}; }
    var url = useUrlChange();
    var usermaven = useUsermaven();
    var lastTrackedUrl = runtimeCore.ref('');
    var trackPageView = function () {
        if (url.value !== lastTrackedUrl.value) {
            if (opts.before) {
                opts.before(usermaven);
            }
            usermaven.track((opts === null || opts === void 0 ? void 0 : opts.typeName) || 'pageview', __assign(__assign({}, opts.payload), { url: window.location.href, path: window.location.pathname, referrer: document.referrer, title: document.title }));
            lastTrackedUrl.value = url.value;
        }
    };
    runtimeCore.watch(url, function () {
        trackPageView();
    });
    runtimeCore.onMounted(function () {
        trackPageView();
    });
    return usermaven;
}

var USERMAVEN_INJECTION_KEY = 'usermaven';
var UsermavenPlugin = {
    install: function (app, options) {
        console.log('UsermavenPlugin installed', options);
        var client = createClient(options);
        app.config.globalProperties.$usermaven = client;
        app.provide(USERMAVEN_INJECTION_KEY, client);
    }
};

exports.UsermavenPlugin = UsermavenPlugin;
exports.createClient = createClient;
exports.usePageView = usePageView;
exports.useUsermaven = useUsermaven;
//# sourceMappingURL=index.js.map
