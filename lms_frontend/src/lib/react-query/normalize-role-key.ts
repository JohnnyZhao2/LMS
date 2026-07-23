export type QueryRole = string | null | undefined;

/**
 * 将当前角色规范化为 query key 片段，避免 null/undefined 导致缓存串扰。
 */
export const normalizeRoleKey = (currentRole: QueryRole) => currentRole ?? 'UNKNOWN';
