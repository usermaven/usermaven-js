import { useCallback, useContext } from "react";
import UsermavenContext from "./UsermavenContext";
import { UsermavenClient, EventPayload, UserProps } from "@usermaven/sdk-js";

/**
 * See for details https://usermaven.com/docs/integrations/next
 */
function useUsermaven(): UsermavenClient & {trackPageView: () => Promise<void>} {
    const client = useContext(UsermavenContext)
    if (!client) {
        throw new Error("Before calling useUsermaven() hook, please wrap your component into <JitsuProvider />. Read more in https://usermaven.com/docs/integrations/next")
    }

    const id = useCallback(
        (userData: UserProps, doNotSendEvent?: boolean): Promise<void> => client?.id(userData, doNotSendEvent),
        [client],
    )

    const trackPageView = useCallback(
        (): Promise<void> => client?.track('pageview'),
        [client],
    )

    const track = useCallback(
        (typeName: string, payload?: EventPayload): Promise<void> => client?.track(typeName, payload),
        [client],
    )

    const rawTrack = useCallback(
        (payload: any): Promise<void> => client?.rawTrack(payload),
        [client],
    )

    const interceptAnalytics = useCallback(
        (analytics: any): void => client?.interceptAnalytics(analytics),
        [client],
    )

    return {
        ...client,
        id,
        track,
        trackPageView,
        rawTrack,
        interceptAnalytics
    }
}

export default useUsermaven;