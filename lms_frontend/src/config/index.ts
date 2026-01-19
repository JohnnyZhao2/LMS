/**
 * 全局配置
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  appName: '学习平台',
  appTagline: 'Academic Excellence',
  isDev: import.meta.env.DEV,
} as const;
