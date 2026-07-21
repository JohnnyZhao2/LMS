export type QueryRole = string | null | undefined;

export const normalizeRoleKey = (currentRole: QueryRole) => currentRole ?? 'UNKNOWN';
