import { App } from 'vue'
import createClient from './client'
import { UsermavenOptions } from "@usermaven/sdk-js";



export const UsermavenPlugin = {
  install: (app: App, options: UsermavenOptions) => {
    const client = createClient(options)
    app.config.globalProperties.$usermaven = client
    app.provide('usermaven', client)
  }
}
