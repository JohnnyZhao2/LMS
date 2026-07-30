import type {
  CreateUserPermissionOverrideRequest,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

import type { PermissionState } from './user-permission-section.types';
import type { PermissionOverrideEntry } from './user-permission-section.types';

const getToggleBlockedReason = ({
  canManageOverride,
  needsCreate,
  needsRevoke,
  nextChecked,
}: {
  canManageOverride: boolean;
  needsCreate: boolean;
  needsRevoke: boolean;
  nextChecked: boolean;
}): string | null => {
  if (needsRevoke && !canManageOverride) {
    return nextChecked ? '当前账号没有撤销权限，无法启用该权限' : '当前账号没有撤销权限，无法禁用该权限';
  }
  if (needsCreate && !canManageOverride) {
    return nextChecked ? '当前账号没有创建权限，无法启用该权限' : '当前账号没有创建权限，无法禁用该权限';
  }
  return null;
};

export const getRolePermissionOverrideBuckets = (
  userOverrides: PermissionOverrideEntry[],
  roleCode: RoleCode,
): {
  activeScopeAllowOverrides: Map<string, PermissionOverrideEntry[]>;
  activeScopeDenyOverrides: Map<string, PermissionOverrideEntry[]>;
} => {
  const activeScopedOverrides = userOverrides.filter((override) => override.appliesToRole === roleCode);
  const activeScopeAllowOverrides = new Map<string, PermissionOverrideEntry[]>();
  const activeScopeDenyOverrides = new Map<string, PermissionOverrideEntry[]>();

  activeScopedOverrides.forEach((override) => {
    const targetMap = override.effect === 'ALLOW' ? activeScopeAllowOverrides : activeScopeDenyOverrides;
    const current = targetMap.get(override.permissionCode) ?? [];
    targetMap.set(override.permissionCode, [...current, override]);
  });

  return { activeScopeAllowOverrides, activeScopeDenyOverrides };
};

export const resolvePermissionState = ({
  allowOverrides,
  canManageOverride,
  denyOverrides,
  fromTemplate,
}: {
  allowOverrides: PermissionOverrideEntry[];
  canManageOverride: boolean;
  denyOverrides: PermissionOverrideEntry[];
  fromTemplate: boolean;
}): PermissionState => {
  const needsCreateToEnable = !fromTemplate && allowOverrides.length === 0;
  const needsCreateToDisable = fromTemplate;
  const needsRevokeToEnable = denyOverrides.length > 0;
  const needsRevokeToDisable = allowOverrides.length > 0;
  const checked = needsRevokeToEnable
    ? false
    : allowOverrides.length > 0
      ? true
      : fromTemplate;

  return {
    checked,
    enableBlockedReason: getToggleBlockedReason({
      nextChecked: true,
      needsCreate: needsCreateToEnable,
      needsRevoke: needsRevokeToEnable,
      canManageOverride,
    }),
    disableBlockedReason: getToggleBlockedReason({
      nextChecked: false,
      needsCreate: needsCreateToDisable,
      needsRevoke: needsRevokeToDisable,
      canManageOverride,
    }),
    fromTemplate,
    allowOverrides,
    denyOverrides,
  };
};

export const buildPermissionTogglePlan = ({
  nextChecked,
  permissionCode,
  permissionState,
  roleCode,
}: {
  nextChecked: boolean;
  permissionCode: string;
  permissionState: PermissionState;
  roleCode: RoleCode;
}): {
  overridesToRevoke: PermissionOverrideEntry[];
  payloadsToCreate: CreateUserPermissionOverrideRequest[];
} => {
  const {
    fromTemplate,
    allowOverrides,
    denyOverrides,
  } = permissionState;
  const overridesToRevoke: PermissionOverrideEntry[] = [];
  const payloadsToCreate: CreateUserPermissionOverrideRequest[] = [];

  if (nextChecked) {
    overridesToRevoke.push(...denyOverrides);
    if (!fromTemplate && allowOverrides.length === 0) {
      payloadsToCreate.push({
        permission_code: permissionCode,
        effect: 'ALLOW',
        applies_to_role: roleCode,
      });
    }
  } else {
    overridesToRevoke.push(...allowOverrides);
    if (fromTemplate) {
      payloadsToCreate.push({
        permission_code: permissionCode,
        effect: 'DENY',
        applies_to_role: roleCode,
      });
    }
  }

  return { overridesToRevoke, payloadsToCreate };
};
