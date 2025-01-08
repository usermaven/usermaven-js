import * as React from 'react'
import UsermavenContext from './UsermavenContext'
import { UsermavenClient } from "@usermaven/sdk-js"
import { PropsWithChildren } from "react"

export interface UsermavenProviderProps {
    client: UsermavenClient | null
}

const UsermavenProvider: React.FC<PropsWithChildren<UsermavenProviderProps>> = function ({children, client}) {
    const Context = UsermavenContext
    return <Context.Provider value={client}>{children}</Context.Provider>
}

export default UsermavenProvider