import type { BuiltinRoleCode, DataScope } from '@/types/common';

export const USER_ROLE_ASSIGN_PERMISSION = 'users.assign_user_role';

/** 系统内置常规岗位（互斥） */
export const BUILTIN_PRIMARY_ROLE_CODES: readonly BuiltinRoleCode[] = [
  'ADMIN',
  'DEPT_MANAGER',
  'MENTOR',
];

export const LEARNER_ROLE_VALUE = '__LEARNER__' as const;

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  ALL: '全部数据',
  CUSTOM_DEPT: '自定义部门',
  DEPT: '本部门数据',
  SELF: '仅本人数据',
};

export const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string }> = [
  { value: 'ALL', label: DATA_SCOPE_LABELS.ALL },
  { value: 'DEPT', label: DATA_SCOPE_LABELS.DEPT },
  { value: 'CUSTOM_DEPT', label: DATA_SCOPE_LABELS.CUSTOM_DEPT },
  { value: 'SELF', label: DATA_SCOPE_LABELS.SELF },
];
