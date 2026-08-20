import type { RoleCode } from '@/types/common';

export const USER_PERMISSION_VIEW_PERMISSION = 'users.view_user_permission';
export const USER_PERMISSION_UPDATE_PERMISSION = 'users.change_user_permission';
export const USER_ROLE_ASSIGN_PERMISSION = 'users.assign_user_role';

export const USER_PERMISSION_ACCESS_PERMISSIONS = [
  USER_PERMISSION_VIEW_PERMISSION,
  USER_PERMISSION_UPDATE_PERMISSION,
];

export const AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS = [
  ...USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_ROLE_ASSIGN_PERMISSION,
];

/** 授权中心只管理角色，学员不参与授权 */
export const MANAGEMENT_ROLE_CODES: RoleCode[] = ['MENTOR', 'DEPT_MANAGER', 'ADMIN'];
