import { UsermavenClient, usermavenClient, UsermavenOptions } from "@usermaven/sdk-js"

function createClient(params: UsermavenOptions): UsermavenClient | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return usermavenClient(params);
}

export default createClient