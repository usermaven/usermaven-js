import { useEffect } from "react";
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";
import { useRouter } from "next/router";

/**
 * @param usermaven instance of initialized UsermavenClient
 * @param opts.callback callback that should be called sending data to usermaven. This will be a good place to identify user
 *                      or/and set a global parameters
 * @param opts.before additional parameters (aka payload)
 */
function usePageView(usermaven: UsermavenClient, opts: { before?: (usermaven: UsermavenClient) => void, typeName?: string, payload?: EventPayload } = {}): UsermavenClient {
    const router = useRouter();

    useEffect(() => {
        const handleRouteChange = () => {
            if (opts.before) {
                opts.before(usermaven);
            }
            usermaven.track(opts?.typeName || 'pageview', opts.payload);
        }

        handleRouteChange();

        router.events.on('routeChangeComplete', handleRouteChange);
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events, usermaven.track, opts.payload, opts.before]);

    return usermaven;
}

export default usePageView;