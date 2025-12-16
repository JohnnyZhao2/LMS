/**
 * Authentication State Store
 * Manages user authentication state using Zustand
 * Requirements: 1.2, 1.5, 2.3
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '@/config';
import { API_ENDPOINTS } from '@/config/api';
import { tokenStorage } from '@/lib/api';
import type { User, Role, RoleCode } from '@/types/domain';
import type { LoginRequest, LoginResponse, SwitchRoleResponse } from '@/types/api';

/**
 * Authentication state interface
 */
interface AuthState {
  // State
  user: User | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  switchRole: (roleCode: RoleCode) => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  initialize: () => void;
}

/**
 * Auth store with persistence
 * Requirements: 1.2 - Store JWT tokens after login
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      currentRole: null,
      availableRoles: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * Login with credentials
       * Requirements: 1.2 - Call login API and store JWT tokens
       */
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch(API_ENDPOINTS.auth.login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || error.detail || '登录失败');
          }
          
          const data: LoginResponse = await response.json();
          
          // Update token storage for API client
          tokenStorage.setAccessToken(data.access_token);
          tokenStorage.setRefreshToken(data.refresh_token);
          
          // Update store state
          set({
            user: data.user,
            currentRole: data.current_role,
            availableRoles: data.available_roles,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Logout and clear all auth state
       * Requirements: 1.5 - Clear local tokens and redirect to login
       */
      logout: () => {
        // Clear token storage
        tokenStorage.clearTokens();
        
        // Reset store state
        set({
          user: null,
          currentRole: null,
          availableRoles: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      /**
       * Switch to a different role
       * Requirements: 2.3 - Call role switch API and update tokens
       */
      switchRole: async (roleCode: RoleCode) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('未登录');
        }
        
        set({ isLoading: true });
        
        try {
          const response = await fetch(API_ENDPOINTS.auth.switchRole, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ role_code: roleCode }),
          });
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || error.detail || '角色切换失败');
          }
          
          const data: SwitchRoleResponse = await response.json();
          
          // Update token storage
          tokenStorage.setAccessToken(data.access_token);
          tokenStorage.setRefreshToken(data.refresh_token);
          
          // Update store state
          set({
            currentRole: data.current_role,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Refresh access token using refresh token
       * Requirements: 1.6 - Auto refresh when token expires
       */
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }
        
        try {
          const response = await fetch(API_ENDPOINTS.auth.refresh, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          
          if (!response.ok) {
            // Refresh failed, logout
            get().logout();
            return false;
          }
          
          const data = await response.json();
          
          // Update token storage
          tokenStorage.setAccessToken(data.access_token);
          if (data.refresh_token) {
            tokenStorage.setRefreshToken(data.refresh_token);
          }
          
          // Update store state
          set({
            accessToken: data.access_token,
            ...(data.refresh_token && { refreshToken: data.refresh_token }),
          });
          
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      /**
       * Set user data
       */
      setUser: (user: User | null) => {
        set({ user });
      },

      /**
       * Set tokens directly
       */
      setTokens: (accessToken: string | null, refreshToken: string | null) => {
        if (accessToken) {
          tokenStorage.setAccessToken(accessToken);
        }
        if (refreshToken) {
          tokenStorage.setRefreshToken(refreshToken);
        }
        
        set({
          accessToken,
          refreshToken,
          isAuthenticated: !!accessToken,
        });
      },

      /**
       * Initialize auth state from localStorage
       * Called on app startup to restore session
       */
      initialize: () => {
        const accessToken = tokenStorage.getAccessToken();
        const refreshToken = tokenStorage.getRefreshToken();
        const userJson = localStorage.getItem(config.userKey);
        const currentRole = localStorage.getItem(config.currentRoleKey) as RoleCode | null;
        
        if (accessToken && userJson) {
          try {
            const user = JSON.parse(userJson) as User;
            set({
              user,
              currentRole,
              accessToken,
              refreshToken,
              isAuthenticated: true,
            });
          } catch {
            // Invalid stored data, clear everything
            tokenStorage.clearTokens();
          }
        }
      },
    }),
    {
      name: 'lms-auth-storage',
      partialize: (state) => ({
        user: state.user,
        currentRole: state.currentRole,
        availableRoles: state.availableRoles,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useCurrentRole = () => useAuthStore((state) => state.currentRole);
export const useAvailableRoles = () => useAuthStore((state) => state.availableRoles);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

