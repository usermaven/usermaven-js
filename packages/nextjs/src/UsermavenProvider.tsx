import * as React from 'react'
import UsermavenContext from './UsermavenContext'
import { UsermavenClient } from "@usermaven/sdk-js"
import {PropsWithChildren} from "react";

export interface JitsuProviderProps {
    client: UsermavenClient
}

const JitsuProvider: React.FC<PropsWithChildren<JitsuProviderProps>> = function ({children, client}) {
    const Context = UsermavenContext
    return <Context.Provider value={client}>{children}</Context.Provider>
}

export default JitsuProvider