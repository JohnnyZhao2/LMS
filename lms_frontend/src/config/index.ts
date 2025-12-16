/**
 * Global application configuration
 * Environment variables and app-wide settings
 */

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  
  // App Information
  appName: 'LMS 学习管理系统',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  
  // Auth Configuration
  tokenKey: 'lms_access_token',
  refreshTokenKey: 'lms_refresh_token',
  userKey: 'lms_user',
  currentRoleKey: 'lms_current_role',
  
  // Token expiry buffer (refresh token 5 minutes before expiry)
  tokenRefreshBuffer: 5 * 60 * 1000, // 5 minutes in ms
} as const;

export type Config = typeof config;
