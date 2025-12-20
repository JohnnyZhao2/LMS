/**
 * 全局配置
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  appName: 'LMS 学习管理系统',
  isDev: import.meta.env.DEV,
} as const;
