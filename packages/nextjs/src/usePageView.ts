
import { useEffect } from "react";
import { EventPayload, UsermavenClient } from "@usermaven/sdk-js";
import { useRouter } from "next/router";

export default function usePageView(
    usermaven: UsermavenClient,
    opts: {
        before?: (usermaven: UsermavenClient) => void,
        typeName?: string,
        payload?: EventPayload
    } = {}
) {
    const router = useRouter();

    useEffect(() => {
        const handleRouteChange = () => {
            if (opts.before) {
                opts.before(usermaven);
            }
            usermaven.track(opts?.typeName || 'pageview', opts.payload);
        }

        handleRouteChange(); // Track initial page load

        router.events.on('routeChangeComplete', handleRouteChange);
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events, usermaven, opts.payload, opts.before, opts.typeName]);
}
