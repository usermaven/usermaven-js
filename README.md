# Usermaven JavaScript SDK

Usermaven JavaScript SDK is a powerful and flexible library for tracking user behavior and events in web applications. It supports both client-side and server-side usage, with a focus on privacy, configurability, and robustness.

## Features

- Cross-platform compatibility (browser and server-side)
- Flexible event tracking with custom payloads
- Automatic tracking of page views, form submissions, and user interactions
- Privacy-focused with configurable data sanitization
- Robust error handling and retry mechanisms
- Extensible architecture for custom tracking features
- Performance optimizations including event batching and debouncing

## Installation

### NPM or Yarn

```bash
npm install @usermaven/sdk-js
```

or

```bash 
yarn add @usermaven/sdk-js
```

### UMD (Universal Module Definition)

For quick integration without a module bundler:

```html
<script src="https://cdn.usermaven.com/sdk/v1/lib.js" 
        data-key="YOUR_API_KEY"
        data-tracking-host="https://events.yourdomain.com">
</script>
```

## Basic Usage

### As a module

```javascript
import { usermavenClient } from '@usermaven/sdk-js';

const client = usermavenClient({
  key: 'YOUR_API_KEY',
  trackingHost: 'https://events.yourdomain.com'
});

// Track an event
client.track('button_click', { 
  buttonId: 'submit-form'
});

// Identify a user
client.id({
  id: 'user123', 
  email: 'user@example.com',
  name: 'John Doe', 
  created_at: '2021-01-01'
});

// Track a page view
client.pageview();
```

### Via UMD

```html
<script>
  // Track an event
  usermaven('track', 'button_click', {
    buttonId: 'submit-form'
  });

  // Identify a user  
  usermaven('id', {
    id: 'user123',
    email: 'user@example.com', 
    name: 'John Doe', 
    created_at: '2021-01-01'

  });

  // Track a page view
  usermaven('pageview');
</script>
```

## Advanced Configuration

```javascript
const client = usermavenClient({
  key: 'YOUR_API_KEY',
  trackingHost: 'https://events.yourdomain.com',
  cookieDomain: '.yourdomain.com',
  logLevel: '1',
  useBeaconApi: false,
  autocapture: true,
  formTracking: 'all',
  autoPageview: true
  // ... other options
});
```

See the `Config` interface in `src/core/config.ts` for all configuration options.

## Server-Side Usage

```javascript
const { usermavenClient } = require('@usermaven/sdk-js');

const client = usermavenClient({
  key: 'YOUR_API_KEY',
  trackingHost: 'https://events.yourdomain.com'
});

client.track('server_event', {
  userId: 'user123',
  action: 'item_purchased' 
});
```

## API Reference

### client.track(eventName, [properties])

Track a custom event.

### client.id(userProperties)

Identify a user and set their properties.

### client.group(groupProperties)

Associate the user with a group (e.g. company).

### client.pageview()

Track a page view event.

### client.set(properties, [options])

Set persistent properties to be included with all future events.

### client.unset(propertyName, [options])

Remove a persistent property.

### client.reset()

Reset the client's state and remove local data.

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
## Supported Platforms

For each major JavaScript platform, there is a specific high-level SDK that provides all the tools you need in a single package.<br/>Please refer to the README and instructions of those SDKs for more detailed information:

* [@usermaven/sdk-js](https://github.com/usermavencom/usermaven-js/tree/master/packages/javascript-sdk) - SDK for Browsers and Node. Works with any JS framework
* [@usermaven/nextjs](https://github.com/usermavencom/usermaven-js/tree/master/packages/nextjs) - SDK for NextJS applications

## Example apps

* [react](https://github.com/usermavencom/usermaven-js/usermaven-react-example)
* [nextjs](https://github.com/usermavencom/usermaven-js/usermaven-next-example)

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.
