import { useCallback, useContext } from "react";
import UsermavenContext from "./UsermavenContext";
import { UsermavenClient, EventPayload, UserProps } from "@usermaven/sdk-js";

type UsermavenWithPageView = UsermavenClient & { trackPageView: () => void };

function useUsermaven(): UsermavenWithPageView {
  const client = useContext(UsermavenContext);
  if (!client) {
    throw new Error("Before calling useUsermaven() hook, please wrap your component into <JitsuProvider />. Read more in http://jitsu.com/docs/sending-data/js-sdk/react");
  }

  const trackPageView = useCallback(() => client.pageview(), [client]);

  const usermavenWithPageView = client as UsermavenWithPageView;
  usermavenWithPageView.trackPageView = trackPageView;

  // Overriding methods with memoized versions
  usermavenWithPageView.id = useCallback(
      (userData: UserProps, doNotSendEvent?: boolean): Promise<void> => client.id(userData, doNotSendEvent),
      [client]
  );

  usermavenWithPageView.track = useCallback(
      (typeName: string, payload?: EventPayload) => client.track(typeName, payload),
      [client]
  );

  usermavenWithPageView.rawTrack = useCallback((payload: any) => client.rawTrack(payload), [client]);

  usermavenWithPageView.set = useCallback(
      (properties: Record<string, any>, opts?: { eventType?: string; persist?: boolean }): void =>
          client.set(properties, opts),
      [client]
  );

  usermavenWithPageView.unset = useCallback(
      (propertyName: string, opts?: { eventType?: string; persist?: boolean }): void =>
          client.unset(propertyName, opts),
      [client]
  );

  return usermavenWithPageView;
}

export default useUsermaven;
