import { useCallback, useContext } from "react";
import UsermavenContext from "./UsermavenContext";
import { UsermavenClient, EventPayload, UserProps } from "@usermaven/sdk-js";

type UsermavenWithPageView = UsermavenClient & { trackPageView: () => void };

/**
 * See for details https://usermaven.com/docs/integrations/next
 */
function useUsermaven(): UsermavenWithPageView {
    const client = useContext(UsermavenContext);
    if (!client) {
        throw new Error("Before calling useUsermaven() hook, please wrap your component into <UsermavenProvider />. Read more in https://usermaven.com/docs/integrations/next");
    }

    const usermavenWithPageView = client as UsermavenWithPageView;

    usermavenWithPageView.id = useCallback(
        (userData: UserProps, doNotSendEvent?: boolean): Promise<void> => client.id(userData, doNotSendEvent),
        [client]
    );

    usermavenWithPageView.trackPageView = useCallback(
        (): void => client.track('pageview'),
        [client]
    );

    usermavenWithPageView.track = useCallback(
        (typeName: string, payload?: EventPayload): void => client.track(typeName, payload),
        [client]
    );

    usermavenWithPageView.rawTrack = useCallback(
        (payload: any): void => client.rawTrack(payload),
        [client]
    );

    return usermavenWithPageView;
}

export default useUsermaven;
