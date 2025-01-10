# Nuxt.js + Usermaven SDK Integration Example

This example demonstrates how to integrate the Usermaven SDK with a Nuxt.js application for analytics tracking.

## Setup Guide

### 1. Install the SDK

```bash
npm install @usermaven/sdk-js
# or
yarn add @usermaven/sdk-js
```

### 2. Create a Plugin

Create a new file `plugins/usermaven.client.ts`:

```typescript
import { defineNuxtPlugin } from '#app'
import { usermavenClient } from '@usermaven/sdk-js'

export default defineNuxtPlugin((nuxtApp) => {
  // Initialize Usermaven
  let usermaven = usermavenClient({
    trackingHost: 'https://events.usermaven.com',
    key: 'YOUR_KEY_HERE',
    autocapture: true
  })

  // Make usermaven available globally
  nuxtApp.provide('usermaven', usermaven)
})
```

### 3. Track Page Views

In your `app.vue`:

```vue
<script setup>
const { $usermaven } = useNuxtApp()

// Track initial page view
onMounted(() => {
  $usermaven.track('pageview')
})

// Track page views on route changes
watch(() => useRoute().fullPath, (newPath) => {
  $usermaven.track('pageview')
})
</script>
```

### 4. Track Custom Events

Example of tracking custom events in your components:

```vue
<script setup>
const { $usermaven } = useNuxtApp()

// Track a button click
const trackButtonClick = () => {
  $usermaven.track('button_clicked', {
    buttonName: 'demo_button',
    timestamp: new Date().toISOString()
  })
}

// Track a form submission
const trackFormSubmit = (formData) => {
  $usermaven.track('form_submitted', {
    formName: 'contact_form',
    formData: formData
  })
}
</script>
```

## Available Features

1. **Automatic Page View Tracking**
   - Tracks page views on initial load and route changes
   - Includes URL and path information

2. **Custom Event Tracking**
   - Track user interactions
   - Add custom properties to events
   - Support for various data types

3. **Auto-capture Features**
   - Automatically captures clicks and form submissions when `autocapture: true`
   - Tracks user sessions and engagement

## Example Pages

This example includes several pages demonstrating different tracking capabilities:

- **Home Page**: Basic page view tracking
- **About Page**: Simple navigation example
- **Custom Events Page**: Demonstrates various custom event tracking:
  - Button click tracking
  - Form submission tracking
  - Custom event properties

## Best Practices

1. **Initialize Early**
   - Set up the SDK in a plugin to ensure it's available throughout the app

2. **Route Change Tracking**
   - Use the Vue router's navigation guards or watchers for consistent page view tracking

3. **Event Properties**
   - Keep event names consistent and descriptive
   - Include relevant context in event properties
   - Avoid sending sensitive information

4. **Error Handling**
   - Wrap tracking calls in try-catch blocks for production
   - Validate data before sending

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Resources

- [Usermaven Documentation](https://docs.usermaven.com/)
- [Nuxt.js Documentation](https://nuxt.com/docs)
- [@usermaven/sdk-js on NPM](https://www.npmjs.com/package/@usermaven/sdk-js)
