import './assets/main.css'
import { UsermavenPlugin } from '@usermaven/vue'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.use(UsermavenPlugin, {
  trackingHost: 'https://events.usermaven.com',
  key: 'UMXLIktQsI', // The key from Usermaven
  autocapture: true, // Enable autocapture
})

app.mount('#app')
