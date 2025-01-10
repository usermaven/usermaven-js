import { defineNuxtPlugin } from '#app'
import { usermavenClient } from '@usermaven/sdk-js'

export default defineNuxtPlugin((nuxtApp) => {
  // Initialize Usermaven
  let usermaven =  usermavenClient({
    trackingHost: 'https://events.usermaven.com',
    key: 'UMXLIktQsI', // The key from Usermaven
    autocapture: true, // Enable autocapture
  })

  // Make usermaven available globally
  nuxtApp.provide('usermaven', usermaven)
})
