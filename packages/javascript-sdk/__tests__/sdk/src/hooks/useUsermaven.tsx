import {
  EventPayload,
  UsermavenClient,
  usermavenClient,
  UsermavenOptions,
} from "@usermaven/sdk-js";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

export type UseUsermaven = {
  usermaven: UsermavenClient;
};

export function useUsermaven(opts: UsermavenOptions): UseUsermaven {
  const usermaven = useMemo(() => usermavenClient(opts), [opts]);
  usermaven.set({ project_id: "UMfoR9lRgg" });
  return { usermaven };
}

export function usePageView(usermaven: UsermavenClient, event?: EventPayload) {
  let location = useLocation();

  useEffect(() => {
    usermaven.track("pageview");
  }, [location, usermaven]);
}
