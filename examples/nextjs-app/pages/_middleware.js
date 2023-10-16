import { createClient, middlewareEnv } from "@usermaven/nextjs";
import { NextResponse } from "next/server";

const usermaven = createClient({
  tracking_host: "https://events.usermaven.com",
  key: "UMXLIktQsI"
})

export function middleware(req, ev) {
  let res = NextResponse.next()
  if (!req?.page?.name) {
    return;
  }
  usermaven.track("middleware_pageview", {env: middlewareEnv(req, res)})
  return res
}