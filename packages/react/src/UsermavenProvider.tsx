import * as React from 'react';
import UsermavenContext from './UsermavenContext'; // Assuming you created this context earlier
import { UsermavenClient } from '@usermaven/sdk-js';
import { PropsWithChildren } from 'react';

// Define the props to accept the client
export interface UsermavenProviderProps {
  client: UsermavenClient;
}

// The functional component that provides the Usermaven client context
const UsermavenProvider: React.FC<
  PropsWithChildren<UsermavenProviderProps>
> = ({ children, client }) => {
  const Context = UsermavenContext;

  // Render the provided client as value within the Context
  return <Context.Provider value={client}>{children}</Context.Provider>;
};

export default UsermavenProvider;
