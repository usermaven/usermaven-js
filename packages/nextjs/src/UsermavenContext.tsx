import { createContext } from 'react'
import { UsermavenClient } from "@usermaven/sdk-js"

const UsermavenContext = createContext<UsermavenClient | null>(null)

export default UsermavenContext