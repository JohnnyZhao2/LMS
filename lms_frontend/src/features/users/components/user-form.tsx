import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Plus,
  Building2,
  Users,
  KeyRound,
  ListFilter,
  Loader2,
  Settings2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/role-config';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
} from '@/features/authorization/api/authorization';
import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';

import { useCreateUser, useUpdateUser, useAssignRoles, useAssignMentor } from '../api/manage-users';
import { useUserDetail, useMentors, useDepartments, useRoles, useUsers } from '../api/get-users';
import { showApiError } from '@/utils/error-handler';
import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideScope,
  RoleCode,
} from '@/types/api';
import type { UserList as UserDetail, Mentor, Department, Role } from '@/types/common';

interface UserFormProps {
  open: boolean;
  userId?: number;
  initialDepartmentId?: number;
  initialMentorId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  username: string;
  employee_id: string;
  password: string;
  department_id: number | undefined;
  role_codes: RoleCode[];
  mentor_id: number | null;
}

interface FormErrors {
  username?: string;
  employee_id?: string;
  password?: string;
  department_id?: string;
}

const MANAGER_MUTEX_ROLE_CODES: RoleCode[] = ['DEPT_MANAGER', 'TEAM_MANAGER'];
const PERMISSION_SCOPE_ORDER: PermissionOverrideScope[] = ['SELF', 'MENTEES', 'DEPARTMENT', 'ALL', 'EXPLICIT_USERS'];
const PERMISSION_SCOPE_OPTIONS: Array<{
  value: PermissionOverrideScope;
  label: string;
  description: string;
}> = [
  { value: 'SELF', label: '本人数据', description: '对本人相关数据生效' },
  { value: 'MENTEES', label: '名下学员', description: '对名下学员相关数据生效' },
  { value: 'DEPARTMENT', label: '同部门', description: '对同部门对象生效' },
  { value: 'ALL', label: '全部对象', description: '对该角色下可访问的全部对象生效' },
  { value: 'EXPLICIT_USERS', label: '指定用户', description: '仅对指定用户对象生效' },
];

const PERMISSION_SCOPE_LABELS: Record<PermissionOverrideScope, string> = {
  ALL: '全部对象',
  SELF: '本人数据',
  MENTEES: '名下学员',
  DEPARTMENT: '同部门',
  EXPLICIT_USERS: '指定用户',
};

const DEFAULT_ROLE_SCOPE_TYPES: Record<RoleCode, PermissionOverrideScope[]> = {
  STUDENT: ['SELF'],
  MENTOR: ['SELF', 'MENTEES'],
  DEPT_MANAGER: ['SELF', 'DEPARTMENT'],
  TEAM_MANAGER: ['ALL'],
  ADMIN: ['ALL'],
};

const DEFAULT_MANAGEABLE_ROLES: Role[] = [
  { code: 'MENTOR', name: '导师' },
  { code: 'DEPT_MANAGER', name: '室经理' },
  { code: 'TEAM_MANAGER', name: '团队经理' },
  { code: 'ADMIN', name: '管理员' },
];

const isRoleSelectionValid = (roleCodes: RoleCode[], isSuperuserAccount: boolean): boolean => {
  const managerCount = roleCodes.filter((code) => MANAGER_MUTEX_ROLE_CODES.includes(code)).length;

  if (managerCount > 1) return false;
  if (isSuperuserAccount) return roleCodes.length === 1 && roleCodes[0] === 'ADMIN';
  return true;
};

const normalizeScopeTypes = (scopeTypes: PermissionOverrideScope[]): PermissionOverrideScope[] => {
  const uniqueScopeTypes = Array.from(new Set(scopeTypes));
  if (uniqueScopeTypes.includes('ALL')) {
    return ['ALL'];
  }
  return PERMISSION_SCOPE_ORDER.filter((scopeType) => uniqueScopeTypes.includes(scopeType));
};



const sameScopeUserIds = (left: number[], right: number[]): boolean => {
  const normalizedLeft = [...new Set(left)].sort((a, b) => a - b);
  const normalizedRight = [...new Set(right)].sort((a, b) => a - b);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const formatScopeSummary = (scopeTypes: PermissionOverrideScope[], scopeUserIds: number[] = []): string => {
  const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
  if (normalizedScopeTypes.length === 0) {
    return '未设置范围';
  }

  return normalizedScopeTypes.map((scopeType) => (
    scopeType === 'EXPLICIT_USERS'
      ? `指定用户 ${scopeUserIds.length} 人`
      : PERMISSION_SCOPE_LABELS[scopeType]
  )).join(' / ');
};

const sameScopeTypes = (left: PermissionOverrideScope[], right: PermissionOverrideScope[]): boolean => {
  const normalizedLeft = normalizeScopeTypes(left);
  const normalizedRight = normalizeScopeTypes(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

/**
 * 用户表单组件 — 外层壳，负责数据获取与 Dialog 控制
 */
export const UserForm: React.FC<UserFormProps> = ({
  open,
  userId,
  initialDepartmentId,
  initialMentorId,
  onClose,
  onSuccess,
}) => {
  const { data: userDetail } = useUserDetail(userId || 0);
  const {
    data: mentors = [],
    isLoading: isMentorsLoading,
    isError: isMentorsError,
  } = useMentors();
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const isEdit = !!userId;
  const roleOptions = roles.length > 0 ? roles : DEFAULT_MANAGEABLE_ROLES;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-xl border border-border flex flex-col bg-background">
        <DialogTitle className="sr-only">
          {isEdit ? '编辑用户档案' : '新建用户档案'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          配置用户基础信息、系统角色，以及基于角色的数据范围和权限开通情况。
        </DialogDescription>
        {open && (
          <UserFormContent
            key={`${userId ?? 'new'}-${userDetail?.id ?? 0}-${initialDepartmentId ?? 'none'}-${initialMentorId ?? 'none'}`}
            isEdit={isEdit}
            userId={userId}
            userDetail={userDetail}
            mentors={mentors}
            isMentorsLoading={isMentorsLoading}
            isMentorsError={isMentorsError}
            departments={departments}
            roles={roleOptions}
            initialDepartmentId={initialDepartmentId}
            initialMentorId={initialMentorId}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

/** 内部表单组件 — 通过 key 重挂载来重置状态，无需 useEffect */
const UserFormContent: React.FC<{
  isEdit: boolean;
  userId?: number;
  userDetail?: UserDetail;
  mentors: Mentor[];
  isMentorsLoading: boolean;
  isMentorsError: boolean;
  departments: Department[];
  roles: Role[];
  initialDepartmentId?: number;
  initialMentorId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}> = ({
  isEdit,
  userId,
  userDetail,
  mentors = [],
  isMentorsLoading,
  isMentorsError,
  departments = [],
  roles = [],
  initialDepartmentId,
  initialMentorId,
  onClose,
  onSuccess,
}) => {
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const assignRoles = useAssignRoles();
    const assignMentor = useAssignMentor();
    const { hasPermission, refreshUser } = useAuth();
    const canViewOverride =
      hasPermission('authorization.user_override.view')
      || hasPermission('authorization.user_override.create')
      || hasPermission('authorization.user_override.revoke');
    const canCreateOverride = hasPermission('authorization.user_override.create');
    const canRevokeOverride = hasPermission('authorization.user_override.revoke');
    const canViewRoleTemplate =
      hasPermission('authorization.role_template.view')
      || hasPermission('authorization.role_template.update');

    // 直接从 props 初始化，组件通过 key 重挂载时自动重置
    const [initialRoleCodes] = useState<RoleCode[]>(() =>
      isEdit && userDetail
        ? userDetail.roles.filter((r) => r.code !== 'STUDENT').map((r) => r.code as RoleCode)
        : [],
    );
    const [initialAssignedMentorId] = useState<number | null>(() =>
      isEdit && userDetail ? (userDetail.mentor?.id || null) : null,
    );

    const [formData, setFormData] = useState<FormData>(() => {
      if (isEdit && userDetail) {
        return {
          username: userDetail.username,
          employee_id: userDetail.employee_id,
          password: '',
          department_id: userDetail.department?.id,
          role_codes: initialRoleCodes,
          mentor_id: initialAssignedMentorId,
        };
      }
      return {
        username: '',
        employee_id: '',
        password: '',
        department_id: initialDepartmentId,
        role_codes: [],
        mentor_id: initialMentorId ?? null,
      };
    });

    const [mentorTouched, setMentorTouched] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const isSuperuserAccount = Boolean(isEdit && userDetail?.is_superuser);
    const shouldLoadUserOverrides = isEdit && Boolean(userId) && canViewOverride;

    const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadUserOverrides);
    const { data: userOverrides = [], isLoading: isLoadingUserOverrides } = useUserPermissionOverrides(
      userId ?? null,
      false,
      shouldLoadUserOverrides,
    );
    const createUserOverride = useCreateUserPermissionOverride();
    const revokeUserOverride = useRevokeUserPermissionOverride();
    const [selectedPermissionModule, setSelectedPermissionModule] = useState('');
    const [selectedPermissionRole, setSelectedPermissionRole] = useState<RoleCode>('STUDENT');
    const [selectedPermissionScopes, setSelectedPermissionScopes] = useState<PermissionOverrideScope[]>(['SELF']);
    const [selectedScopeUserIds, setSelectedScopeUserIds] = useState<number[]>([]);
    const [scopeUserSearch, setScopeUserSearch] = useState('');
    const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
    const [permissionToggleLoading, setPermissionToggleLoading] = useState<Record<string, boolean>>({});
    const shouldLoadScopeUsers = shouldLoadUserOverrides && selectedPermissionScopes.includes('EXPLICIT_USERS');
    const { data: scopeUsers = [] } = useUsers({}, { enabled: shouldLoadScopeUsers });

    const validate = (): boolean => {
      const newErrors: FormErrors = {};
      if (!formData.username.trim()) newErrors.username = '此项必填';
      if (!formData.employee_id.trim()) newErrors.employee_id = '此项必填';
      if (!isEdit && !formData.password.trim()) newErrors.password = '设置初始密码';
      if (!formData.department_id) newErrors.department_id = '请选择部门';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validate()) return;
      try {
        if (isEdit) {
          // 检查角色是否有变化
          const roleSet = new Set(formData.role_codes);
          const initialRoleSet = new Set(initialRoleCodes);
          const rolesChanged =
            roleSet.size !== initialRoleSet.size ||
            [...roleSet].some((code) => !initialRoleSet.has(code));

          // 一次性更新用户信息（包括角色），后端会在一个事务中处理
          await updateUser.mutateAsync({
            id: userId!,
            data: {
              username: formData.username,
              employee_id: formData.employee_id,
              department_id: formData.department_id,
              ...(rolesChanged ? { role_codes: formData.role_codes } : {}),
            },
          });

          if (mentorTouched && formData.mentor_id !== initialAssignedMentorId) {
            await assignMentor.mutateAsync({ id: userId!, mentorId: formData.mentor_id });
          }
          toast.success("账号信息已更新");
        } else {
          const newUser = await createUser.mutateAsync({
            username: formData.username,
            employee_id: formData.employee_id,
            password: formData.password,
            department_id: formData.department_id!,
            mentor_id: formData.mentor_id,
          });
          // 创建成功后分配额外角色
          if (formData.role_codes.length > 0) {
            await assignRoles.mutateAsync({ id: newUser.id, roles: formData.role_codes });
          }
          toast.success("新账号已创建");
        }
        onClose();
        onSuccess?.();
      } catch (error) {
        showApiError(error);
      }
    };

    const getAvatarText = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

    const toggleRole = (code: RoleCode) => {
      setFormData((prev) => {
        const active = prev.role_codes.includes(code);
        const nextRoleCodes = active
          ? prev.role_codes.filter((c) => c !== code)
          : [...prev.role_codes, code];

        if (!isRoleSelectionValid(nextRoleCodes, isSuperuserAccount)) return prev;

        return {
          ...prev,
          role_codes: nextRoleCodes,
        };
      });
    };

    const isRoleToggleDisabled = (roleCode: RoleCode, active: boolean): boolean => {
      const nextRoleCodes = active
        ? formData.role_codes.filter((code) => code !== roleCode)
        : [...formData.role_codes, roleCode];
      return !isRoleSelectionValid(nextRoleCodes, isSuperuserAccount);
    };

    const roleNameMap = useMemo(() => {
      const nameMap = new Map<string, string>();
      roles.forEach((role) => {
        nameMap.set(role.code, role.name);
      });
      if (!nameMap.has('STUDENT')) {
        nameMap.set('STUDENT', '学员');
      }
      return nameMap;
    }, [roles]);

    const previewRoleCodes = useMemo<RoleCode[]>(() => {
      if (isSuperuserAccount) {
        return ['ADMIN'];
      }
      return Array.from(new Set<RoleCode>(['STUDENT', ...formData.role_codes]));
    }, [formData.role_codes, isSuperuserAccount]);

    const roleTemplateQueries = useRolePermissionTemplates(
      previewRoleCodes,
      shouldLoadUserOverrides && canViewRoleTemplate,
    );

    const roleTemplatePermissionCodeMap = useMemo(() => {
      const templateMap = new Map<RoleCode, string[]>();
      previewRoleCodes.forEach((roleCode, index) => {
        templateMap.set(roleCode, roleTemplateQueries[index]?.data?.permission_codes ?? []);
      });
      return templateMap;
    }, [previewRoleCodes, roleTemplateQueries]);

    const roleTemplateDefaultScopeMap = useMemo(() => {
      const scopeMap = new Map<RoleCode, PermissionOverrideScope[]>();
      previewRoleCodes.forEach((roleCode, index) => {
        scopeMap.set(
          roleCode,
          roleTemplateQueries[index]?.data?.default_scope_types ?? DEFAULT_ROLE_SCOPE_TYPES[roleCode] ?? ['SELF'],
        );
      });
      return scopeMap;
    }, [previewRoleCodes, roleTemplateQueries]);

    const roleTemplateScopeOptionMap = useMemo(() => {
      const scopeOptionMap = new Map<RoleCode, Array<{
        value: PermissionOverrideScope;
        label: string;
        description: string;
        inherited_by_default: boolean;
      }>>();

      previewRoleCodes.forEach((roleCode, index) => {
        const scopeOptions = roleTemplateQueries[index]?.data?.scope_options;
        if (scopeOptions?.length) {
          scopeOptionMap.set(
            roleCode,
            scopeOptions.map((option) => ({
              value: option.code,
              label: option.label,
              description: option.description,
              inherited_by_default: option.inherited_by_default,
            })),
          );
          return;
        }

        const inheritedScopeTypes = new Set(DEFAULT_ROLE_SCOPE_TYPES[roleCode] ?? ['SELF']);
        scopeOptionMap.set(
          roleCode,
          PERMISSION_SCOPE_OPTIONS.map((option) => ({
            ...option,
            inherited_by_default: inheritedScopeTypes.has(option.value),
          })),
        );
      });

      return scopeOptionMap;
    }, [previewRoleCodes, roleTemplateQueries]);

    const overrideRoleOptions = useMemo<Array<{ code: RoleCode; label: string }>>(
      () => previewRoleCodes.map((roleCode) => ({
        code: roleCode,
        label: roleNameMap.get(roleCode) ?? roleCode,
      })),
      [previewRoleCodes, roleNameMap],
    );

    const normalizedSelectedPermissionRole = useMemo<RoleCode>(() => {
      if (previewRoleCodes.includes(selectedPermissionRole)) {
        return selectedPermissionRole;
      }
      return previewRoleCodes[0] ?? 'STUDENT';
    }, [selectedPermissionRole, previewRoleCodes]);

    useEffect(() => {
      if (!previewRoleCodes.includes(selectedPermissionRole)) {
        setSelectedPermissionRole(previewRoleCodes[0] ?? 'STUDENT');
      }
    }, [previewRoleCodes, selectedPermissionRole]);

    const selectedRoleDefaultScopeTypes = useMemo(
      () => normalizeScopeTypes(
        roleTemplateDefaultScopeMap.get(normalizedSelectedPermissionRole)
          ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
          ?? ['SELF'],
      ),
      [normalizedSelectedPermissionRole, roleTemplateDefaultScopeMap],
    );

    const selectedRoleScopeOptions = useMemo(
      () => roleTemplateScopeOptionMap.get(normalizedSelectedPermissionRole) ?? PERMISSION_SCOPE_OPTIONS.map((option) => ({
        ...option,
        inherited_by_default: selectedRoleDefaultScopeTypes.includes(option.value),
      })),
      [normalizedSelectedPermissionRole, roleTemplateScopeOptionMap, selectedRoleDefaultScopeTypes],
    );

    const isAllScopeActive = selectedPermissionScopes.includes('ALL');
    const isDefaultScopeActive = sameScopeTypes(selectedPermissionScopes, selectedRoleDefaultScopeTypes);

    const selectedRoleDefaultScopeKey = selectedRoleDefaultScopeTypes.join('|');

    useEffect(() => {
      setSelectedPermissionScopes((prev) => (
        sameScopeTypes(prev, selectedRoleDefaultScopeTypes) ? prev : selectedRoleDefaultScopeTypes
      ));
      setSelectedScopeUserIds((prev) => (prev.length === 0 ? prev : []));
      setScopeUserSearch((prev) => (prev ? '' : prev));
      setShowScopeAdjustPanel((prev) => (prev ? false : prev));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedSelectedPermissionRole, selectedRoleDefaultScopeKey]);

    const permissionModules = useMemo(
      () => Array.from(new Set(permissionCatalog.map((item) => item.module).filter(Boolean))),
      [permissionCatalog],
    );

    const activePermissionModule = useMemo(() => {
      if (selectedPermissionModule && permissionModules.includes(selectedPermissionModule)) {
        return selectedPermissionModule;
      }
      return permissionModules[0] ?? '';
    }, [permissionModules, selectedPermissionModule]);

    const activeModulePermissions = useMemo(
      () => permissionCatalog.filter((permission) => permission.module === activePermissionModule),
      [permissionCatalog, activePermissionModule],
    );

    const activeScopedOverrides = useMemo(
      () =>
        userOverrides.filter((override) => {
          if (!override.is_active) {
            return false;
          }
          return override.applies_to_role === normalizedSelectedPermissionRole;
        }),
      [userOverrides, normalizedSelectedPermissionRole],
    );

    const activeScopeAllowOverrides = useMemo(
      () => activeScopedOverrides.filter((override) => override.effect === 'ALLOW'),
      [activeScopedOverrides],
    );

    const activeScopeDenyOverrides = useMemo(
      () => activeScopedOverrides.filter((override) => override.effect === 'DENY'),
      [activeScopedOverrides],
    );

    const roleTemplatePermissionCodes = useMemo(() => {
      if (!canViewRoleTemplate) {
        return new Set<string>();
      }
      return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
    }, [canViewRoleTemplate, normalizedSelectedPermissionRole, roleTemplatePermissionCodeMap]);

    const filteredScopeUsers = useMemo(
      () => scopeUsers.filter((user) => {
        const keyword = scopeUserSearch.trim().toLowerCase();
        if (!keyword) return true;
        return (
          user.username.toLowerCase().includes(keyword)
          || user.employee_id.toLowerCase().includes(keyword)
        );
      }),
      [scopeUserSearch, scopeUsers],
    );

    const isPermissionToggling = (permissionCode: string) =>
      Boolean(permissionToggleLoading[`${normalizedSelectedPermissionRole}:${permissionCode}`]);

    const getPermissionTemplateCount = (roleCode: RoleCode) =>
      (roleTemplatePermissionCodeMap.get(roleCode) ?? []).length;

    const toggleSelectedPermissionScope = (scopeType: PermissionOverrideScope) => {
      setSelectedPermissionScopes((prev) => {
        if (scopeType === 'SELF') {
          return prev;
        }
        const nextScopeTypes = prev.includes(scopeType)
          ? prev.filter((item) => item !== scopeType)
          : [...prev, scopeType];
        const normalizedScopeTypes = normalizeScopeTypes(nextScopeTypes);

        if (!normalizedScopeTypes.includes('EXPLICIT_USERS')) {
          setSelectedScopeUserIds([]);
          setScopeUserSearch('');
        }

        if (normalizedScopeTypes.length === 0) {
          return selectedRoleDefaultScopeTypes;
        }

        return normalizedScopeTypes;
      });
    };

    const applyDefaultScopePreset = () => {
      setSelectedPermissionScopes(selectedRoleDefaultScopeTypes);
      setSelectedScopeUserIds([]);
      setScopeUserSearch('');
    };

    const applyAllScopePreset = () => {
      setSelectedPermissionScopes(['ALL']);
      setSelectedScopeUserIds([]);
      setScopeUserSearch('');
    };

    const matchesSelectedScope = (scopeType: PermissionOverrideScope, scopeUserIds: number[]) => {
      if (scopeType !== 'EXPLICIT_USERS') {
        return selectedPermissionScopes.includes(scopeType);
      }
      return selectedPermissionScopes.includes('EXPLICIT_USERS') && sameScopeUserIds(scopeUserIds, selectedScopeUserIds);
    };

    const getPermissionState = (permissionCode: string) => {
      const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);
      const allowOverrides = activeScopeAllowOverrides.filter((override) => override.permission_code === permissionCode);
      const denyOverrides = activeScopeDenyOverrides.filter((override) => override.permission_code === permissionCode);
      const selectedStandardScopeTypes: PermissionOverrideScope[] = normalizeScopeTypes(
        selectedPermissionScopes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS'),
      );
      const inheritedScopeTypes: PermissionOverrideScope[] = fromTemplate
        ? selectedRoleDefaultScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS')
        : [];

      const isStandardScopeGranted = (scopeType: PermissionOverrideScope) => {
        const hasDenyOverride = denyOverrides.some((override) => override.scope_type === scopeType);
        if (hasDenyOverride) {
          return false;
        }
        if (inheritedScopeTypes.includes(scopeType)) {
          return true;
        }
        return allowOverrides.some((override) => override.scope_type === scopeType);
      };

      const hasExactExplicitAllow = allowOverrides.some(
        (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
      );
      const hasExactExplicitDeny = denyOverrides.some(
        (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
      );

      const selectedAllowOverrides = allowOverrides.filter((override) =>
        matchesSelectedScope(override.scope_type, override.scope_user_ids),
      );
      const selectedDenyOverrides = denyOverrides.filter((override) =>
        matchesSelectedScope(override.scope_type, override.scope_user_ids),
      );

      const effectiveStandardScopeTypes = normalizeScopeTypes(
        PERMISSION_SCOPE_ORDER.filter(
          (scopeType) => scopeType !== 'EXPLICIT_USERS' && isStandardScopeGranted(scopeType),
        ),
      );
      const effectiveExplicitUserIds = Array.from(
        new Set(
          allowOverrides
            .filter((override) => override.scope_type === 'EXPLICIT_USERS')
            .flatMap((override) => override.scope_user_ids),
        ),
      ).sort((left, right) => left - right);

      const addedScopeTypes = normalizeScopeTypes(
        PERMISSION_SCOPE_ORDER.filter((scopeType) => (
          scopeType !== 'EXPLICIT_USERS'
          && allowOverrides.some((override) => override.scope_type === scopeType)
          && !inheritedScopeTypes.includes(scopeType)
        )),
      );
      const removedScopeTypes = normalizeScopeTypes(
        PERMISSION_SCOPE_ORDER.filter((scopeType) => (
          scopeType !== 'EXPLICIT_USERS'
          && denyOverrides.some((override) => override.scope_type === scopeType)
          && inheritedScopeTypes.includes(scopeType)
        )),
      );

      const checked = selectedPermissionScopes.length > 0
        && selectedStandardScopeTypes.every((scopeType) => isStandardScopeGranted(scopeType))
        && (
          !selectedPermissionScopes.includes('EXPLICIT_USERS')
          || (selectedScopeUserIds.length > 0 && hasExactExplicitAllow && !hasExactExplicitDeny)
        );

      const missingSelectedAllowScopeTypes = selectedStandardScopeTypes.filter((scopeType) => (
        !inheritedScopeTypes.includes(scopeType)
        && !allowOverrides.some((override) => override.scope_type === scopeType)
      ));
      const inheritedSelectedScopeTypes = selectedStandardScopeTypes.filter((scopeType) =>
        inheritedScopeTypes.includes(scopeType),
      );

      return {
        checked,
        fromTemplate,
        allowOverrides,
        denyOverrides,
        selectedAllowOverrides,
        selectedDenyOverrides,
        inheritedScopeTypes,
        inheritedSelectedScopeTypes,
        addedScopeTypes,
        removedScopeTypes,
        effectiveStandardScopeTypes,
        effectiveExplicitUserIds,
        hasExactExplicitAllow,
        hasExactExplicitDeny,
        missingSelectedAllowScopeTypes,
      };
    };

    const toggleScopeUser = (scopeUserId: number) => {
      setSelectedScopeUserIds((prev) => (
        prev.includes(scopeUserId)
          ? prev.filter((id) => id !== scopeUserId)
          : [...prev, scopeUserId]
      ));
    };

    const handlePermissionToggle = async (permissionCode: string, nextChecked: boolean) => {
      if (!userId) return;

      if (selectedPermissionScopes.length === 0) {
        toast.error('请至少选择一个作用对象范围');
        return;
      }
      if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length === 0) {
        toast.error('请选择至少一个指定用户');
        return;
      }

      const scopeRole = normalizedSelectedPermissionRole;
      const key = `${scopeRole}:${permissionCode}`;
      const {
        checked: currentChecked,
        fromTemplate,
        selectedAllowOverrides,
        selectedDenyOverrides,
        inheritedSelectedScopeTypes,
        hasExactExplicitAllow,
        missingSelectedAllowScopeTypes,
      } = getPermissionState(permissionCode);

      if (currentChecked === nextChecked) return;

      const needsCreateWhenEnable = missingSelectedAllowScopeTypes.length > 0
        || (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow);
      const needsCreateWhenDisable = fromTemplate && inheritedSelectedScopeTypes.length > 0;
      const needsRevokeWhenEnable = selectedDenyOverrides.length > 0;
      const needsRevokeWhenDisable = selectedAllowOverrides.length > 0;

      if (nextChecked && needsRevokeWhenEnable && !canRevokeOverride) return;
      if (nextChecked && needsCreateWhenEnable && !canCreateOverride) return;
      if (!nextChecked && needsRevokeWhenDisable && !canRevokeOverride) return;
      if (!nextChecked && needsCreateWhenDisable && !canCreateOverride) return;

      setPermissionToggleLoading((prev) => ({ ...prev, [key]: true }));
      try {
        if (nextChecked) {
          await Promise.all(
            selectedDenyOverrides.map((override) =>
              revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
            ),
          );

          const payloads: CreateUserPermissionOverrideRequest[] = [
            ...missingSelectedAllowScopeTypes.map((scopeType) => ({
              permission_code: permissionCode,
              effect: 'ALLOW' as const,
              applies_to_role: scopeRole,
              scope_type: scopeType,
              scope_user_ids: [],
            })),
          ];

          if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
            payloads.push({
              permission_code: permissionCode,
              effect: 'ALLOW',
              applies_to_role: scopeRole,
              scope_type: 'EXPLICIT_USERS',
              scope_user_ids: selectedScopeUserIds,
            });
          }

          await Promise.all(
            payloads.map((payload) => createUserOverride.mutateAsync({ userId, data: payload })),
          );
        } else {
          await Promise.all(
            selectedAllowOverrides.map((override) =>
              revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
            ),
          );

          const payloads: CreateUserPermissionOverrideRequest[] = inheritedSelectedScopeTypes.map((scopeType) => ({
            permission_code: permissionCode,
            effect: 'DENY',
            applies_to_role: scopeRole,
            scope_type: scopeType,
            scope_user_ids: [],
          }));

          await Promise.all(
            payloads.map((payload) => createUserOverride.mutateAsync({ userId, data: payload })),
          );
        }
        await refreshUser();
      } catch (error) {
        showApiError(error);
      } finally {
        setPermissionToggleLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

    const isLoading = createUser.isPending || updateUser.isPending || assignRoles.isPending || assignMentor.isPending;

    return (
      <>
        {/* Header */}
        <div className="px-8 py-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? '编辑用户档案' : '新建用户档案'}
            </h2>
            {!isEdit && (
              <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold">
                新成员
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 bg-background overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 relative">
            {/* Extremely Subtle Vertical Divider */}
            <div className="hidden lg:block absolute left-1/2 top-4 bottom-4 w-[1px] bg-slate-100/50 -translate-x-1/2" />

            {/* Left Column: Essential Info */}
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-1 text-slate-400">
                  <User className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">账号基础信息</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">真实姓名</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          value={formData.username}
                          onChange={e => setFormData({ ...formData, username: e.target.value })}
                          placeholder="输入姓名"
                          className="h-10 bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                        />
                      </div>
                      {errors.username && <p className="text-xs font-bold text-destructive mt-1">{errors.username}</p>}
                    </div>

                    {/* 2. Employee ID */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">员工工号</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          value={formData.employee_id}
                          onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                          className="h-10 font-mono bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                          placeholder="例如：EMP001"
                        />
                      </div>
                      {errors.employee_id && <p className="text-xs font-bold text-destructive mt-1">{errors.employee_id}</p>}
                    </div>
                  </div>

                  {/* 3. Password */}
                  {!isEdit && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">初始密码</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className="h-10 bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                          placeholder="设置 6 位以上密码"
                        />
                      </div>
                      {errors.password && <p className="text-xs font-bold text-destructive mt-1">{errors.password}</p>}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Assignments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* 4. Mentor Select */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 text-slate-400">
                      <Users className="w-4 h-4" />
                      <h3 className="text-sm font-bold text-slate-800">带教导师 (可选)</h3>
                    </div>
                    <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                      <Select
                        value={formData.mentor_id?.toString() || ''}
                        onValueChange={(v) => {
                          setMentorTouched(true);
                          setFormData({ ...formData, mentor_id: v ? Number(v) : null });
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-10 bg-transparent border-none rounded-none px-0 pr-12 text-sm font-medium text-slate-700 data-[placeholder]:text-slate-200 shadow-none focus:ring-0",
                          formData.mentor_id && "[&>svg]:hidden"
                        )}>
                          <SelectValue placeholder={isMentorsLoading ? "正在加载导师列表" : "点击选择导师档案"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[9999] rounded-xl border-border">
                          {isMentorsLoading ? (
                            <div className="px-3 py-4 text-sm text-text-muted">正在加载导师列表...</div>
                          ) : isMentorsError ? (
                            <div className="px-3 py-4 text-sm text-destructive">导师列表加载失败，请刷新后重试</div>
                          ) : mentors.filter(m => !userId || m.id !== userId).length === 0 ? (
                            <div className="px-3 py-4 text-sm text-text-muted">当前没有可选导师</div>
                          ) : (
                            mentors.filter(m => !userId || m.id !== userId).map(m => (
                              <SelectItem key={m.id} value={m.id.toString()} className="focus:bg-muted/50 cursor-pointer">
                                <div className="flex items-center gap-3 py-1">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                      {getAvatarText(m.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">{m.username}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {formData.mentor_id && (
                        <button
                          type="button"
                          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-destructive transition-colors z-[20]"
                          onClick={() => {
                            setMentorTouched(true);
                            setFormData({ ...formData, mentor_id: null });
                          }}
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5. Organization Assignment */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 text-slate-400">
                      <Building2 className="w-4 h-4" />
                      <h3 className="text-sm font-bold text-slate-800">组织架构分配</h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {departments.map(dept => {
                        const active = formData.department_id === dept.id;
                        return (
                          <div
                            key={dept.id}
                            onClick={() => setFormData({ ...formData, department_id: dept.id })}
                            className={cn(
                              "cursor-pointer px-6 py-2 rounded-full border transition-all duration-300 ease-in-out",
                              active
                                ? "border-primary text-primary bg-white shadow-sm"
                                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700"
                            )}
                          >
                            <span className="text-sm font-bold">{dept.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Roles & Privileges */}
            <div className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-slate-400" /> 系统角色与权限
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.filter(r => r.code !== 'STUDENT').map(role => {
                    const roleCode = role.code as RoleCode;
                    const active = formData.role_codes.includes(roleCode);
                    const disabled = isRoleToggleDisabled(roleCode, active);
                    const colorConfig = ROLE_COLORS[role.code] || ROLE_COLORS.STUDENT;

                    return (
                      <div
                        key={role.code}
                        onClick={() => !disabled && toggleRole(roleCode)}
                        className={cn(
                          "group relative p-4 rounded-xl border transition-all duration-500 cursor-pointer overflow-hidden bg-white shadow-sm",
                          disabled ? "opacity-20 grayscale cursor-not-allowed" : "active:scale-[0.98]",
                          active
                            ? "border-slate-200/60"
                            : "border-slate-100/50 hover:border-slate-200"
                        )}
                      >
                        {/* Background Minimal Icon */}
                        <div className={cn(
                          "absolute -right-3 -bottom-5 transition-all duration-700",
                          active ? cn("opacity-[0.2] scale-110", colorConfig.textClass) : "opacity-[0.3] scale-100 text-slate-200"
                        )}>
                          {role.code === 'ADMIN' ? <Shield className="w-24 h-24" strokeWidth={0.5} /> :
                            role.code === 'DEPT_MANAGER' ? <Building2 className="w-24 h-24" strokeWidth={0.5} /> :
                              role.code === 'TEAM_MANAGER' ? <Users className="w-24 h-24" strokeWidth={0.5} /> :
                                <User className="w-24 h-24" strokeWidth={0.5} />}
                        </div>

                        <div className="relative z-10 flex flex-col gap-1">
                          <p className={cn(
                            "text-sm font-bold transition-all duration-300",
                            active ? colorConfig.textClass : "text-slate-600"
                          )}>{role.name}</p>
                          <p className={cn(
                            "text-[10px] font-bold transition-all duration-300 opacity-60",
                            active ? colorConfig.textClass : "text-slate-300"
                          )}>
                            {role.code === 'ADMIN' ? '全系统最高管理权限' :
                              role.code === 'DEPT_MANAGER' ? '部门及人员管理' :
                                role.code === 'TEAM_MANAGER' ? '团队协作与执行' :
                                  '职能岗位权限'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    用户权限自定义
                  </h3>
                </div>
              </div>

              {!canViewOverride ? (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                  您没有“用户权限自定义配置”权限，仅可查看上方默认角色包信息。
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-8 items-start relative">
                  {/* Left Sidebar Menu */}
                  <aside className="space-y-2 sticky top-4">
                    <div className="flex items-center gap-2 pb-2 pl-1 text-slate-400">
                      <ListFilter className="h-4 w-4" />
                      <p className="text-sm font-bold text-slate-800">模块菜单</p>
                    </div>
                    <div className="space-y-1">
                      {permissionModules.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                          暂无模块数据
                        </div>
                      ) : (
                        permissionModules.map((moduleName) => {
                          const active = activePermissionModule === moduleName;
                          const moduleLabel = getModulePresentation(moduleName).label;
                          return (
                            <button
                              key={moduleName}
                              type="button"
                              onClick={() => setSelectedPermissionModule(moduleName)}
                              className={cn(
                                'w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all duration-300',
                                active
                                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                              )}
                            >
                              {moduleLabel}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </aside>

                  {/* Main Content */}
                  <div className="space-y-4 relative">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:items-end">
                      <div className="space-y-1">
                        <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">生效角色</label>
                        <Select
                          value={normalizedSelectedPermissionRole}
                          onValueChange={(value) => setSelectedPermissionRole(value as RoleCode)}
                        >
                          <SelectTrigger className="h-8 rounded-md border-slate-200/70 bg-white text-xs font-bold text-slate-700 transition-all hover:border-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="min-w-[220px] overflow-hidden rounded-xl border-slate-200 shadow-xl">
                            {overrideRoleOptions.map((item) => (
                              <SelectItem key={item.code} value={item.code} className="py-2.5 text-xs font-medium">
                                {item.label} <span className="ml-1 text-slate-400">({getPermissionTemplateCount(item.code)})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">数据范围</label>
                        <Popover open={showScopeAdjustPanel} onOpenChange={setShowScopeAdjustPanel}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200/70 bg-white px-3 text-xs text-slate-700 transition-all hover:border-primary/30"
                            >
                              <span className="font-bold line-clamp-1 text-left">
                                {formatScopeSummary(selectedPermissionScopes, selectedScopeUserIds)}
                              </span>
                              <Settings2 className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[360px] p-0 rounded-xl shadow-xl border-slate-200/70" sideOffset={8}>
                            <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-800">快速设置</h4>
                                {isDefaultScopeActive ? (
                                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] px-1.5 py-0 font-bold">默认继承中</Badge>
                                ) : isAllScopeActive ? (
                                   <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0 font-bold">全部对象生效中</Badge>
                                ) : (
                                   <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 font-bold">自定义组合</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={applyDefaultScopePreset}
                                  className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", isDefaultScopeActive ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}
                                >
                                  恢复默认继承
                                </button>
                                <button
                                  type="button"
                                  onClick={applyAllScopePreset}
                                  className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", isAllScopeActive ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}
                                >
                                  允许全部对象
                                </button>
                              </div>
                            </div>

                            <div className="p-3">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">组合范围叠加 (可多选)</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedRoleScopeOptions.filter(opt => opt.value !== 'ALL').map(option => {
                                  const isSelected = selectedPermissionScopes.includes(option.value);
                                  const disabled = isAllScopeActive;
                                  return (
                                    <label
                                      key={option.value}
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                                        disabled ? "opacity-50 cursor-not-allowed bg-slate-50/50 border-slate-100" :
                                        isSelected ? "border-primary/40 bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        disabled={disabled}
                                        onCheckedChange={() => !disabled && toggleSelectedPermissionScope(option.value)}
                                        className="w-3.5 h-3.5 rounded-[4px]"
                                      />
                                      <div className="flex flex-col">
                                        <span className={cn("text-[11px] font-bold", disabled ? "text-slate-400" : isSelected ? "text-primary" : "text-slate-700")}>
                                          {option.label}
                                        </span>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>

                              <div className={cn(
                                "transition-all duration-300 overflow-hidden",
                                selectedPermissionScopes.includes('EXPLICIT_USERS') && !isAllScopeActive ? "mt-3 opacity-100" : "max-h-0 opacity-0"
                              )}>
                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-600">已选指定用户 ({selectedScopeUserIds.length})</span>
                                  </div>
                                  <Input
                                    value={scopeUserSearch}
                                    onChange={(e) => setScopeUserSearch(e.target.value)}
                                    placeholder="搜索姓名或工号..."
                                    className="h-8 text-[11px] bg-slate-50 border-slate-200 shadow-none focus-visible:ring-1"
                                  />
                                  <div className="h-[140px] overflow-y-auto space-y-1 pr-1">
                                    {filteredScopeUsers.length === 0 ? (
                                      <div className="py-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">无匹配用户</div>
                                    ) : (
                                      filteredScopeUsers.map(u => {
                                        const selected = selectedScopeUserIds.includes(u.id);
                                        return (
                                          <label key={u.id} className={cn(
                                            "flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors border border-transparent",
                                            selected && "bg-primary/[0.03] border-primary/10"
                                          )}>
                                            <Checkbox
                                              checked={selected}
                                              onCheckedChange={() => toggleScopeUser(u.id)}
                                              className="w-3.5 h-3.5 rounded-[4px]"
                                            />
                                            <div className="flex items-center gap-2">
                                              <Avatar className="w-5 h-5">
                                                <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 font-bold">
                                                  {getAvatarText(u.username)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className={cn("text-[11px] font-medium", selected ? "text-primary font-bold" : "text-slate-700")}>{u.username}</span>
                                            </div>
                                          </label>
                                        )
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {!canViewRoleTemplate && (
                      <div className="px-2">
                        <p className="text-[11px] text-slate-400">
                          当前账号没有角色模板查看权限，下面仅准确展示用户自定义覆盖。
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      {activeModulePermissions.length === 0 ? (
                        <div className="py-12 text-center text-sm font-medium text-slate-400">当前模块暂无可配置权限</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                          {activeModulePermissions.map((permission) => {
                            const permissionState = getPermissionState(permission.code);
                            const checked = permissionState.checked;
                            const loading = isPermissionToggling(permission.code);
                            const needsCreateToEnable = permissionState.missingSelectedAllowScopeTypes.length > 0
                              || (
                                selectedPermissionScopes.includes('EXPLICIT_USERS')
                                && selectedScopeUserIds.length > 0
                                && !permissionState.hasExactExplicitAllow
                              );
                            const needsCreateToDisable = permissionState.fromTemplate
                              && permissionState.inheritedSelectedScopeTypes.length > 0;
                            const needsRevokeToEnable = permissionState.selectedDenyOverrides.length > 0;
                            const needsRevokeToDisable = permissionState.selectedAllowOverrides.length > 0;
                            const effectiveScopeTypes = permissionState.effectiveExplicitUserIds.length > 0
                              ? [...permissionState.effectiveStandardScopeTypes, 'EXPLICIT_USERS' as PermissionOverrideScope]
                              : permissionState.effectiveStandardScopeTypes;
                            const addedScopeTypes = permissionState.effectiveExplicitUserIds.length > 0
                              ? [...permissionState.addedScopeTypes, 'EXPLICIT_USERS' as PermissionOverrideScope]
                              : permissionState.addedScopeTypes;
                            const removedScopeTypes = permissionState.removedScopeTypes;
                            return (
                              <label
                                key={permission.code}
                                className={cn(
                                  'group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all duration-300',
                                  checked
                                    ? 'border-primary/20 bg-primary/[0.03] shadow-[0_2px_10px_-4px_rgba(var(--primary),0.05)] hover:border-primary/30'
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5',
                                )}
                              >
                                <div className="flex items-start justify-between gap-3 min-w-0">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">{permission.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono line-clamp-1">{permission.code}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                    {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                                    <Checkbox
                                      checked={checked}
                                      disabled={
                                        loading
                                        || (
                                          checked
                                            ? (
                                              (needsRevokeToDisable && !canRevokeOverride)
                                              || (needsCreateToDisable && !canCreateOverride)
                                            )
                                            : (
                                              (needsRevokeToEnable && !canRevokeOverride)
                                              || (needsCreateToEnable && !canCreateOverride)
                                            )
                                        )
                                      }
                                      onCheckedChange={(value) => handlePermissionToggle(permission.code, value === true)}
                                      className={cn("transition-all duration-300 rounded", checked ? "scale-110" : "")}
                                    />
                                  </div>
                                </div>

                                {(permissionState.fromTemplate || permissionState.allowOverrides.length > 0 || permissionState.denyOverrides.length > 0) && (
                                  <div className="mt-auto space-y-2 border-t border-slate-100/60 pt-2">
                                    {effectiveScopeTypes.length > 0 && (
                                      <p className="text-[11px] font-medium leading-5 text-slate-500">
                                        生效范围: {formatScopeSummary(effectiveScopeTypes, permissionState.effectiveExplicitUserIds)}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap gap-1.5 shrink-0">
                                    {permissionState.fromTemplate && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-md bg-slate-100/50 border-transparent text-slate-500 font-bold px-1.5 py-0 text-[10px]"
                                      >
                                        角色默认
                                      </Badge>
                                    )}
                                    {addedScopeTypes.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-md bg-emerald-50/50 border-emerald-200/50 text-emerald-600 font-bold px-1.5 py-0 text-[10px] normal-case tracking-normal shrink-0 max-w-[160px] truncate"
                                      >
                                        新增范围: {formatScopeSummary(addedScopeTypes, permissionState.effectiveExplicitUserIds)}
                                      </Badge>
                                    )}
                                    {removedScopeTypes.length > 0 && (
                                      <Badge
                                        variant="warning"
                                        className="rounded-md bg-red-50/50 border-red-200/50 text-red-600 font-bold px-1.5 py-0 text-[10px] normal-case tracking-normal shadow-none shrink-0 max-w-[160px] truncate"
                                      >
                                        已移除: {formatScopeSummary(removedScopeTypes)}
                                      </Badge>
                                    )}
                                    </div>
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoadingUserOverrides && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
                      <div className="bg-white border border-slate-100 shadow-xl px-6 py-4 rounded-full flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        <span className="text-sm font-bold text-slate-700">正在同步当前权限状态...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Aligned with Grid */}
        <div className="px-8 pb-8 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            <div className="hidden lg:block" />
            <div className="flex items-center justify-end gap-10">
              <button
                onClick={onClose}
                className="text-sm font-bold text-slate-300 hover:text-slate-500 transition-colors"
              >
                取消
              </button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="h-11 px-10 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:translate-y-[1px] disabled:opacity-50"
              >
                {isLoading ? "处理中..." : isEdit ? "更新" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  };
