# Official Usermaven SDK for React


## General

This package is a wrapper around `@usermaven/sdk-js`, with added functionality related to React.

## Installation

To use Usermaven SDK, install npm package

```bash
npm install @usermaven/react
```

Import and configure Usermaven SDK Provider

```typescript jsx
//...
import { createClient, UsermavenProvider } from "@usermaven/react";

// initialize Usermaven core
const usermavenClient = createClient({
  tracking_host: "__USERMAVEN_HOST__",
  key: "__API_KET__",
  // See Usermaven SDK parameters section for more options
});

// wrap our app with Usermaven provider
ReactDOM.render(
  <React.StrictMode>
    <UsermavenProvider client={usermavenClient}>
      <App />
    </UsermavenProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
```
See [parameters list](https://usermaven.com/docs/sending-data/js-sdk/parameters-reference) for `createClient()` call.

## Usage

```typescript jsx
import { useUsermaven } from "@usermaven/react";

const App = () => {
  const {id, track, trackPageView} = useUsermaven(); // import methods from useUsermaven hook

  useEffect(() => {
    id({id: '__USER_ID__', email: '__USER_EMAIL__'}); // identify current user for all track events
    trackPageView() // send page_view event
  }, [])
  
  const onClick = (btnName: string) => {
    track('btn_click', {btn: btnName}); // send btn_click event with button name payload on click
  }
  
  return (
    <button onClick="() => onClick('test_btn')">Test button</button>
  )
}
```
\
To enable automatic pageview tracking, add `usePageView()` hook. This hook will send pageview each time
user loads a new page (including internal SPA pages). This hook relies on [React Router](https://reactrouter.com/) and
requires `react-router` (>=5.x) package to be present
```typescript jsx
const App = () => {
  usePageView() //this hook will send pageview track event on router change

  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="page" element={<Page />} />
    </Routes>
  );
}
```
\
If you need to pre-configure usermaven event - for example, identify a user, it's possible to do via `before` callback:
```typescript
usePageView({before: (usermaven) => usermaven.id({id: '__USER_ID__', email: '__USER_EMAIL__'})})
```

## Hooks

### useUsermaven

Returns object with `id`, `track`, `trackPageView`, `rawTrack`, `set`, `unset` and `interceptAnalytics` [methods of Usermaven SDK](https://usermaven.com/docs/sending-data/js-sdk/methods-reference).

### usePageView

Can be used only with react-router. Sends `pageview` event on every route change.
