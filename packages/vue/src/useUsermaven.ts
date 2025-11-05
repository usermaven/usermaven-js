import { inject } from '@vue/runtime-core';
import { UsermavenClient } from '@usermaven/sdk-js';

const USERMAVEN_INJECTION_KEY = 'usermaven';

export default function useUsermaven() {
  const usermaven = inject<UsermavenClient>(USERMAVEN_INJECTION_KEY);

  if (!usermaven) {
    throw new Error(
      'Usermaven instance not found. Make sure to use UsermavenPlugin.',
    );
  }

  return usermaven;
}
