# @usermaven/vue

Vue.js SDK for Usermaven Analytics

## Installation

```bash
npm install @usermaven/vue
# or
yarn add @usermaven/vue
```

## Usage

### Setup the Plugin

```typescript
import { createApp } from 'vue'
import { UsermavenPlugin } from '@usermaven/vue'
import App from './App.vue'

const app = createApp(App)

app.use(UsermavenPlugin, {
    key: 'your-api-key',
    trackingHost: 'https://events.usermaven.com',
    autocapture: true,
    // Additional options

})

app.mount('#app')
```

### Using the Composables

#### useUsermaven

```vue
<script setup>
import { useUsermaven } from '@usermaven/vue'

const usermaven = useUsermaven()

// Track an event
usermaven.track('button_click', {
  buttonId: 'submit-button'
})

// Identify a user
usermaven.identify('user123', {
  email: 'user@example.com',
  name: 'John Doe'
})
</script>
```

#### usePageView

```vue
<script setup>
import { usePageView } from '@usermaven/vue'

// Automatically tracks page views when route changes
const { track } = usePageView()

// Manually track a page view if needed
track('pageview')
</script>
```

## License

MIT
