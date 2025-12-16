/**
 * Global State Stores
 * Re-exports all Zustand stores for convenient imports
 */

// Auth store
export {
  useAuthStore,
  useUser,
  useCurrentRole,
  useAvailableRoles,
  useIsAuthenticated,
  useAuthLoading,
} from './auth';

// UI store
export {
  useUIStore,
  useSidebarCollapsed,
  useSidebarMobileOpen,
  useTheme,
  useGlobalLoading,
  type Theme,
} from './ui';

