import type { DataScope } from '@/types/common';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  implies: string[];
}

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  data_scope: DataScope;
  department_ids: number[];
  is_builtin: boolean;
  is_active: boolean;
  permission_codes: string[];
}

export interface CreateRolePayload {
  name: string;
  data_scope: DataScope;
  department_ids?: number[];
  permission_codes?: string[];
}

export interface UpdateRolePayload {
  roleCode: string;
  name?: string;
  data_scope?: DataScope;
  department_ids?: number[];
  is_active?: boolean;
  permission_codes?: string[];
}
