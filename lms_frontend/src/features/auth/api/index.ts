/**
 * Auth API exports
 * @module features/auth/api
 */

export { login } from './login';
export { logout } from './logout';
export { refreshToken } from './refresh-token';
export { switchRole } from './switch-role';

/**
 * Auth API object for convenient imports
 */
export const authApi = {
  login: async (...args: Parameters<typeof import('./login').login>) => 
    (await import('./login')).login(...args),
  logout: async (...args: Parameters<typeof import('./logout').logout>) => 
    (await import('./logout')).logout(...args),
  refreshToken: async (...args: Parameters<typeof import('./refresh-token').refreshToken>) => 
    (await import('./refresh-token')).refreshToken(...args),
  switchRole: async (...args: Parameters<typeof import('./switch-role').switchRole>) => 
    (await import('./switch-role')).switchRole(...args),
};

export default authApi;
