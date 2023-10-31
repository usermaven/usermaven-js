# Official Usermaven SDK for NextJS


## General

This package is a wrapper around `@usermaven/sdk-js`, with added functionality related to NextJS.

## Installation

With NextJS there're several ways on how to add Usermaven tracking

## Client Side Tracking

First, create or update your `_app.js` following this code
```jsx
import { createClient, UsermavenProvider } from "@usermaven/nextjs";

// initialize Usermaven client
const usermavenClient = createClient({
  tracking_host: "__USERMAVEN_HOST__",
  key: "__API_KET__",
  // See Usermaven SDK parameters section for more options
});

// wrap our app with Usermaven provider
function MyApp({Component, pageProps}) {
  return <UsermavenProvider client={usermavenClient}>
    <Component {...pageProps} />
  </UsermavenProvider>
}

export default MyApp
```
See [parameters list](https://usermaven.com/docs/sending-data/js-sdk/parameters-reference) for `createClient()` call.

After usermaven client and provider are configured you will be able to use `useUsermaven` hook in your components
```jsx
import { useUsermaven } from "@usermaven/nextjs";

const Main = () => {
  const {id, trackPageView, track} = useUsermaven(); // import methods from useUsermaven hook

  useEffect(() => {
    id({id: '__USER_ID__', email: '__USER_EMAIL__'}); // identify current user for all events
    trackPageView() // send pageview event
  }, [])

  const onClick = (btnName) => {
    track('btn_click', {btn: btnName}); // send btn_click event with button name payload on click
  }

  return (
    <button onClick="() => onClick('test_btn')">Test button</button>
  )
}
```
Please note, that `useUsermaven` uses `useEffect()` with related side effects.

\
To enable automatic pageview tracking, add `usePageView()` hook to your `_app.js`. This hook will send pageview each time
user loads a new page. This hook relies on [NextJS Router](https://nextjs.org/docs/api-reference/next/router)
```jsx
import { createClient, UsermavenProvider } from "@usermaven/nextjs";

// initialize Usermaven client
const usermavenClient = createClient({
  tracking_host: "__USERMAVEN_HOST__",
  key: "__API_KET__",
  // See Usermaven SDK parameters section for more options
});

function MyApp({Component, pageProps}) {
  usePageView(usermavenClient); // this hook will send pageview track event on router change

  // wrap our app with Usermaven provider
  return <UsermavenProvider client={usermavenClient}>
    <Component {...pageProps} />
  </UsermavenProvider>
}

export default MyApp
```
If you need to pre-configure usermaven event - for example, identify a user, it's possible to do via `before` callback:
```javascript
usePageView(usermavenClient, {before: (usermaven) => usermaven.id({id: '__USER_ID__', email: '__USER_EMAIL__'})})
```

## Server Side Tracking

Usermaven can track events on server-side:
* **Pros:** this method is 100% reliable and ad-block resistant
* **Cons:** static rendering will not be possible; `next export` will not work; fewer data points will be collected - attributes such as screen-size, device

### Manual tracking

For manual tracking you need to initialize Usermaven client
```javascript
import { createClient } from "@usermaven/nextjs";

// initialize Usermaven client
const usermavenClient = createClient({
  tracking_host: "__USERMAVEN_HOST__",
  key: "__API_KET__",
  // See Usermaven SDK parameters section for more options
});
```
after that, you will be able to user [Usermaven client](https://usermaven.com/docs/sending-data/js-sdk/methods-reference), for example, in `getServerSideProps`
```
export async function getServerSideProps() {
  usermaven.track("page_view", {page: req.page})

  return { props: {} }
}
```

### Automated page view tracking

Usermaven could track page views automatically via use of `_middleware.js` which has been introduced in NextJS 12

```javascript
export function middleware(req, ev) {
  const {page} = req
  if ( !page?.name ) {
    return;
  }
  usermaven.track("page_view", {page: req.page})
}
```


## Example app

You can find example app [here](https://github.com/usermaven/usermaven-next-example).