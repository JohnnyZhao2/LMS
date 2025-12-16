/**
 * UI State Store
 * Manages UI-related state like sidebar collapse, theme, etc.
 * Requirements: 22.1, 22.2
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme type
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * UI state interface
 */
interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  
  // Theme state
  theme: Theme;
  
  // Loading states
  globalLoading: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setGlobalLoading: (loading: boolean) => void;
}

/**
 * UI store with persistence for user preferences
 * Requirements: 22.1, 22.2 - Support sidebar collapse on different devices
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: 'dark',
      globalLoading: false,

      /**
       * Toggle sidebar collapsed state
       * Requirements: 22.2 - Support sidebar collapse on tablet
       */
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      /**
       * Set sidebar collapsed state directly
       */
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      /**
       * Toggle mobile sidebar open state
       * Requirements: 22.3 - Mobile drawer sidebar
       */
      toggleMobileSidebar: () => {
        set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen }));
      },

      /**
       * Set mobile sidebar open state directly
       */
      setMobileSidebarOpen: (open: boolean) => {
        set({ sidebarMobileOpen: open });
      },

      /**
       * Set theme
       */
      setTheme: (theme: Theme) => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        } else {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },

      /**
       * Set global loading state
       */
      setGlobalLoading: (loading: boolean) => {
        set({ globalLoading: loading });
      },
    }),
    {
      name: 'lms-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useSidebarMobileOpen = () => useUIStore((state) => state.sidebarMobileOpen);
export const useTheme = () => useUIStore((state) => state.theme);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);

