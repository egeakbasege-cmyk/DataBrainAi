/**
 * Compatibility re-export — all auth logic lives in /auth.ts (Auth.js v5).
 * Import directly from '@/auth' in new code.
 */
export { auth, handlers, signIn, signOut } from '@/auth'
