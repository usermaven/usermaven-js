import { inject } from 'vue'
import { UsermavenClient } from '@usermaven/sdk-js'

export default function useUsermaven() {
  const usermaven = inject<UsermavenClient>('usermaven')
  
  if (!usermaven) {
    throw new Error('Usermaven instance not found. Make sure to use UsermavenPlugin.')
  }

  return usermaven
}
