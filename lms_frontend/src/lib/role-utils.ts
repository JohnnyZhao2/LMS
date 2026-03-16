import type { RoleCode } from '@/types/api';

export const ADMIN_LIKE_ROLES: RoleCode[] = ['ADMIN', 'SUPER_ADMIN'];

export const isAdminLikeRole = (role: RoleCode | null | undefined): boolean => {
  if (!role) {
    return false;
  }
  return ADMIN_LIKE_ROLES.includes(role);
};
