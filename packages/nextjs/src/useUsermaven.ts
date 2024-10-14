import {useCallback, useContext} from "react";
import UsermavenContext from "./UsermavenContext";
import {EventPayload, UserProps} from "@usermaven/sdk-js";

export type UsermavenClient = {
    trackPageView: () => void,
    id: (userData: UserProps, doNotSendEvent?: boolean) => Promise<void>,
    track: (typeName: string, payload?: EventPayload) => void,
    rawTrack: (payload: any) => void,
    set: (properties: Record<string, any>, opts?: { eventType?: string, persist?: boolean }) => void,
    unset: (propertyName: string, opts?: { eventType?: string, persist?: boolean }) => void,
}

/**
 * See for details http://jitsu.com/docs/sending-data/js-sdk/react
 */
function useUsermaven(): UsermavenClient {
    const client = useContext(UsermavenContext)
    if (!client) {
        throw new Error("Before calling useUsermaven() hook, please wrap your component into <JitsuProvider />. Read more in http://jitsu.com/docs/sending-data/js-sdk/react")
    }

    const id = useCallback(
        (userData: UserProps, doNotSendEvent?: boolean): Promise<void> => client?.id(userData, doNotSendEvent),
        [client],
    )

    const trackPageView = useCallback(
        (): void => client?.track('pageview'),
        [client],
    )

    const track = useCallback(
        (typeName: string, payload?: EventPayload): void => client?.track(typeName, payload),
        [client],
    )

    const rawTrack = useCallback(
        (payload: any): void => client?.rawTrack(payload),
        [client],
    )

    const set = useCallback(
        (properties: Record<string, any>, opts?: {
            eventType?: string,
            persist?: boolean
        }): void => client?.set(properties, opts),
        [client],
    )

    const unset = useCallback(
        (propertyName: string, opts?: {
            eventType?: string,
            persist?: boolean
        }): void => client?.unset(propertyName, opts),
        [client],
    )

    return {
        ...client,
        id,
        track,
        trackPageView,
        rawTrack,
        set,
        unset
    }
}

export default useUsermaven;
