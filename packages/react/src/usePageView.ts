import { useEffect } from "react";
import { useLocation } from "react-router";
import useUsermaven from "./useUsermaven";
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";

/**
 * @param opts.callback callback that should be called sending data to jitsu. This will be a good place to identify user
 *                      or/and set a global parameters
 * @param opts.before additional parameters (aka payload)
 */
function usePageView(opts: { before?: (usermaven: UsermavenClient) => void, typeName?: string, payload?: EventPayload } = {}): UsermavenClient {
    let location = useLocation();
    const usermaven = useUsermaven()
    useEffect(() => {
        if (opts.before) {
            opts.before(usermaven);
        }
        usermaven.track(opts?.typeName || 'pageview', opts.payload);
    }, [location, usermaven.track, opts.payload, opts.before]);

    return usermaven;
}

export default usePageView;