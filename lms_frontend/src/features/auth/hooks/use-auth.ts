import { useAuth as useAuthContext } from '../stores/auth-context';

/**
 * 认证相关 hooks
 * 重新导出 useAuth，保持 API 一致性
 */
export const useAuth = useAuthContext;

