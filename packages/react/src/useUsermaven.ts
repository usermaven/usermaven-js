import { useCallback, useContext } from "react";
import UsermavenContext from "./UsermavenContext";
import { UsermavenClient, EventPayload, UserProps } from "@usermaven/sdk-js";

/**
 * See for details http://jitsu.com/docs/sending-data/js-sdk/react
 */
function useUsermaven(): UsermavenClient & {trackPageView: () => Promise<void>} {
  const client = useContext(UsermavenContext)
  if (!client) {
    throw new Error("Before calling useUsermaven() hook, please wrap your component into <JitsuProvider />. Read more in http://jitsu.com/docs/sending-data/js-sdk/react")
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

  const set = useCallback(
      (properties: Record<string, any>, opts?: { eventType?: string, persist?: boolean }): void => client?.set(properties, opts),
      [client],
  )

  const unset = useCallback(
      (propertyName: string, opts?: { eventType?: string, persist?: boolean }): void => client?.unset(propertyName, opts),
      [client],
  )

  return {
    ...client,
    id,
    track,
    trackPageView,
    rawTrack,
    interceptAnalytics,
    set,
    unset
  }
}

export default useUsermaven;