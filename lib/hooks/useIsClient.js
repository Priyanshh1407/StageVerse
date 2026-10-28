import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * false during server render and hydration, true afterwards.
 * Replaces the `useEffect(() => setMounted(true), [])` pattern without an extra render pass.
 */
export function useIsClient() {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
