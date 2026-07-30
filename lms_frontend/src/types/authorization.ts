export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  constraint_summary: string;
  is_active: boolean;
}

export interface UserPermissions {
  permission_codes: string[];
}

interface PermissionCapability {
  allowed: boolean;
}

export type CapabilityMap = Record<string, PermissionCapability>;
