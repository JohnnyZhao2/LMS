export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  implies: string[];
}

export interface UserPermissions {
  user_id: number;
  permission_codes: string[];
  /** 当前管理角色 Group 基础权限（下限，不可关闭） */
  base_permission_codes: string[];
}

export interface GroupPermissions {
  role_code: string;
  permission_codes: string[];
}
