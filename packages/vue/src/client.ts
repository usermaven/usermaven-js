import {
  UsermavenClient,
  usermavenClient,
  UsermavenOptions,
} from '@usermaven/sdk-js';

function createClient(params: UsermavenOptions): UsermavenClient {
  return usermavenClient(params);
}

export default createClient;
