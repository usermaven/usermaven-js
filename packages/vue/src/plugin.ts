import { App } from '@vue/runtime-core'
import createClient from './client'
import { UsermavenOptions } from "@usermaven/sdk-js"

const USERMAVEN_INJECTION_KEY = 'usermaven'

export const UsermavenPlugin = {
  install: (app: App, options: UsermavenOptions) => {
    const client = createClient(options)
    app.config.globalProperties.$usermaven = client
    app.provide(USERMAVEN_INJECTION_KEY, client)
  }
}
