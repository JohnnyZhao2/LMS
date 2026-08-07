export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  implies: string[];
  is_active: boolean;
}

interface PermissionCapability {
  allowed: boolean;
}

export type CapabilityMap = Record<string, PermissionCapability>;

export interface UserPermissions {
  user_id: number;
  permission_codes: string[];
  inherited_permission_codes: string[];
}

export interface GroupPermissions {
  role_code: string;
  permission_codes: string[];
}
