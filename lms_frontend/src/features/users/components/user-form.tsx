import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Plus,
  Building2,
  Users,
  KeyRound,
  ListFilter,
  Clock3,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
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
const PERMISSION_SCOPE_OPTIONS: Array<{
  value: PermissionOverrideScope;
  label: string;
  description: string;
}> = [
    { value: 'ALL', label: '全部对象', description: '对该用户能操作的全部对象生效' },
    { value: 'SELF', label: '仅本人', description: '只对其本人相关对象生效' },
    { value: 'MENTEES', label: '仅名下学员', description: '只对其名下学员生效' },
    { value: 'DEPARTMENT', label: '仅同部门', description: '只对同部门对象生效' },
    { value: 'EXPLICIT_USERS', label: '指定用户', description: '只对指定用户对象生效' },
  ];

const PERMISSION_SCOPE_LABELS: Record<PermissionOverrideScope, string> = {
  ALL: '全部对象',
  SELF: '仅本人',
  MENTEES: '仅名下学员',
  DEPARTMENT: '仅同部门',
  EXPLICIT_USERS: '指定用户',
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

const formatOverrideExpiry = (value: string | null): string => {
  if (!value) return '永久';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '永久';

  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    const [selectedPermissionRole, setSelectedPermissionRole] = useState<'ALL' | RoleCode>('ALL');
    const [selectedPermissionScope, setSelectedPermissionScope] = useState<PermissionOverrideScope>('ALL');
    const [selectedScopeUserIds, setSelectedScopeUserIds] = useState<number[]>([]);
    const [permissionExpiresAt, setPermissionExpiresAt] = useState('');
    const [scopeUserSearch, setScopeUserSearch] = useState('');
    const [permissionToggleLoading, setPermissionToggleLoading] = useState<Record<string, boolean>>({});
    const shouldLoadScopeUsers = shouldLoadUserOverrides && selectedPermissionScope === 'EXPLICIT_USERS';
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

    const overrideRoleOptions = useMemo<Array<{ code: RoleCode; label: string }>>(
      () => previewRoleCodes.map((roleCode) => ({
        code: roleCode,
        label: roleNameMap.get(roleCode) ?? roleCode,
      })),
      [previewRoleCodes, roleNameMap],
    );

    const normalizedSelectedPermissionRole = useMemo<'ALL' | RoleCode>(() => {
      if (selectedPermissionRole === 'ALL') {
        return 'ALL';
      }
      return previewRoleCodes.includes(selectedPermissionRole) ? selectedPermissionRole : 'ALL';
    }, [selectedPermissionRole, previewRoleCodes]);

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
    const activeModuleLabel = activePermissionModule
      ? getModulePresentation(activePermissionModule).label
      : '未选择';

    const activeScopedOverrides = useMemo(
      () =>
        userOverrides.filter((override) => {
          if (!override.is_active) {
            return false;
          }
          if (normalizedSelectedPermissionRole === 'ALL') {
            return override.applies_to_role === null;
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

      if (normalizedSelectedPermissionRole === 'ALL') {
        return new Set(
          previewRoleCodes.flatMap((roleCode) => roleTemplatePermissionCodeMap.get(roleCode) ?? []),
        );
      }

      return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
    }, [
      canViewRoleTemplate,
      normalizedSelectedPermissionRole,
      previewRoleCodes,
      roleTemplatePermissionCodeMap,
    ]);

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

    const getOverrideSummaryText = (scopeType: PermissionOverrideScope, scopeUserIds: number[], expiresAt: string | null) => {
      const scopeLabel = scopeType === 'EXPLICIT_USERS'
        ? `指定用户 ${scopeUserIds.length} 人`
        : PERMISSION_SCOPE_LABELS[scopeType];
      const expiresLabel = expiresAt ? `截止 ${formatOverrideExpiry(expiresAt)}` : '永久';

      return `${scopeLabel} · ${expiresLabel}`;
    };

    const getPermissionTemplateCount = (roleCode: RoleCode) =>
      (roleTemplatePermissionCodeMap.get(roleCode) ?? []).length;

    const getPermissionState = (permissionCode: string) => {
      const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);
      const allowOverrides = activeScopeAllowOverrides.filter((override) => override.permission_code === permissionCode);
      const denyOverrides = activeScopeDenyOverrides.filter((override) => override.permission_code === permissionCode);
      const checked = denyOverrides.length > 0 ? false : fromTemplate || allowOverrides.length > 0;

      return {
        checked,
        fromTemplate,
        allowOverrides,
        denyOverrides,
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

      const scopeRole = normalizedSelectedPermissionRole === 'ALL' ? null : normalizedSelectedPermissionRole;
      const key = `${normalizedSelectedPermissionRole}:${permissionCode}`;
      const {
        checked: currentChecked,
        fromTemplate,
        allowOverrides,
        denyOverrides,
      } = getPermissionState(permissionCode);

      if (currentChecked === nextChecked) return;
      if (nextChecked && denyOverrides.length > 0 && !canRevokeOverride) return;
      if (nextChecked && denyOverrides.length === 0 && !canCreateOverride) return;
      if (!nextChecked && allowOverrides.length > 0 && !canRevokeOverride) return;
      if (!nextChecked && allowOverrides.length === 0 && fromTemplate && !canCreateOverride) return;
      if (!nextChecked && allowOverrides.length === 0 && !fromTemplate) return;
      if (nextChecked && selectedPermissionScope === 'EXPLICIT_USERS' && selectedScopeUserIds.length === 0) {
        toast.error('请选择至少一个指定用户');
        return;
      }
      if (!nextChecked && fromTemplate && selectedPermissionScope === 'EXPLICIT_USERS' && selectedScopeUserIds.length === 0) {
        toast.error('请选择至少一个指定用户');
        return;
      }

      setPermissionToggleLoading((prev) => ({ ...prev, [key]: true }));
      try {
        if (nextChecked) {
          if (denyOverrides.length > 0) {
            for (const override of denyOverrides) {
              await revokeUserOverride.mutateAsync({ userId, overrideId: override.id });
            }
          } else {
            const expiresAtDate = permissionExpiresAt ? new Date(permissionExpiresAt) : null;
            const expiresAtIso = expiresAtDate && !Number.isNaN(expiresAtDate.getTime())
              ? expiresAtDate.toISOString()
              : null;
            const payload: CreateUserPermissionOverrideRequest = {
              permission_code: permissionCode,
              effect: 'ALLOW',
              applies_to_role: scopeRole,
              scope_type: selectedPermissionScope,
              scope_user_ids: selectedPermissionScope === 'EXPLICIT_USERS' ? selectedScopeUserIds : [],
              expires_at: expiresAtIso,
            };
            await createUserOverride.mutateAsync({ userId, data: payload });
          }
        } else {
          if (allowOverrides.length > 0) {
            for (const override of allowOverrides) {
              await revokeUserOverride.mutateAsync({ userId, overrideId: override.id });
            }
          } else if (fromTemplate) {
            const expiresAtDate = permissionExpiresAt ? new Date(permissionExpiresAt) : null;
            const expiresAtIso = expiresAtDate && !Number.isNaN(expiresAtDate.getTime())
              ? expiresAtDate.toISOString()
              : null;
            const payload: CreateUserPermissionOverrideRequest = {
              permission_code: permissionCode,
              effect: 'DENY',
              applies_to_role: scopeRole,
              scope_type: selectedPermissionScope,
              scope_user_ids: selectedPermissionScope === 'EXPLICIT_USERS' ? selectedScopeUserIds : [],
              expires_at: expiresAtIso,
            };
            await createUserOverride.mutateAsync({ userId, data: payload });
          }
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
                  <p className="text-xs text-slate-400 mt-1">
                    决策顺序：DENY 覆盖 {'>'} ALLOW 覆盖 {'>'} 角色模板
                  </p>
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
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">模块权限赋权</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          勾选即赋权，取消即撤销。若需调整作用对象或截止时间，请先取消再重新勾选。
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs border-slate-200 text-slate-600 bg-slate-50 px-3 py-1 font-bold">
                        当前模块：{activeModuleLabel}
                      </Badge>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-8 shadow-sm">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500">用户角色</p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => setSelectedPermissionRole('ALL')}
                            className={cn(
                              'group relative p-4 rounded-xl border transition-all duration-300 text-left overflow-hidden',
                              normalizedSelectedPermissionRole === 'ALL'
                                ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                            )}
                          >
                            <p className={cn("text-sm font-bold transition-colors", normalizedSelectedPermissionRole === 'ALL' ? 'text-white' : 'text-slate-700')}>全部激活角色</p>
                            <p className={cn(
                              'mt-1 text-xs transition-colors',
                              normalizedSelectedPermissionRole === 'ALL' ? 'text-white/80' : 'text-slate-400',
                            )}>默认包合并视图 + 用户自定义</p>
                            <p className={cn(
                              'mt-4 text-[11px] font-bold transition-colors',
                              normalizedSelectedPermissionRole === 'ALL' ? 'text-white/90' : 'text-primary',
                            )}>{roleTemplatePermissionCodes.size} 个权限点</p>
                          </button>
                          {overrideRoleOptions.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => setSelectedPermissionRole(item.code)}
                              className={cn(
                                'group relative p-4 rounded-xl border transition-all duration-300 text-left overflow-hidden',
                                normalizedSelectedPermissionRole === item.code
                                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                              )}
                            >
                              <p className={cn("text-sm font-bold transition-colors", normalizedSelectedPermissionRole === item.code ? 'text-white' : 'text-slate-700')}>{item.label}</p>
                              <p className={cn(
                                'mt-1 text-xs transition-colors',
                                normalizedSelectedPermissionRole === item.code ? 'text-white/80' : 'text-slate-400',
                              )}>单角色默认包 + 用户自定义</p>
                              <p className={cn(
                                'mt-4 text-[11px] font-bold transition-colors',
                                normalizedSelectedPermissionRole === item.code ? 'text-white/90' : 'text-primary',
                              )}>{getPermissionTemplateCount(item.code)} 个默认权限点</p>
                            </button>
                          ))}
                        </div>
                        {!canViewRoleTemplate && (
                          <p className="text-[11px] text-slate-400 mt-2">
                            当前账号没有角色模板查看权限，下面仅准确展示用户自定义覆盖。
                          </p>
                        )}
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2 pt-2">
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-slate-500">作用对象 Scope</p>
                          <Select
                            value={selectedPermissionScope}
                            onValueChange={(value) => {
                              const nextScope = value as PermissionOverrideScope;
                              setSelectedPermissionScope(nextScope);
                              if (nextScope !== 'EXPLICIT_USERS') {
                                setSelectedScopeUserIds([]);
                                setScopeUserSearch('');
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-xs text-slate-700 font-medium transition-colors shadow-none">
                              <SelectValue placeholder="选择作用对象" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                              {PERMISSION_SCOPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="py-2.5 cursor-pointer">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{option.label}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{option.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-slate-500">权限截止时间</p>
                          <div className="relative">
                            <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="datetime-local"
                              value={permissionExpiresAt}
                              onChange={(event) => setPermissionExpiresAt(event.target.value)}
                              className="h-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 pl-10 text-xs text-slate-700 font-medium transition-colors shadow-none"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>留空表示永久有效</span>
                            {permissionExpiresAt && (
                              <button
                                type="button"
                                onClick={() => setPermissionExpiresAt('')}
                                className="font-bold text-primary transition-colors hover:text-primary/80"
                              >
                                清空时间
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedPermissionScope === 'EXPLICIT_USERS' && (
                        <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">指定用户范围</p>
                              <p className="text-xs text-slate-500 mt-1">只有这些用户对象会命中当前新勾选的权限覆盖</p>
                            </div>
                            <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-slate-600 font-bold px-3">
                              已选 {selectedScopeUserIds.length} 人
                            </Badge>
                          </div>

                          <Input
                            value={scopeUserSearch}
                            onChange={(event) => setScopeUserSearch(event.target.value)}
                            placeholder="搜索姓名或工号"
                            className="h-10 rounded-xl border-slate-200 bg-white mb-4 shadow-sm"
                          />

                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {filteredScopeUsers.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-xs text-slate-400">
                                没有匹配的用户
                              </div>
                            ) : (
                              filteredScopeUsers.map((scopeUser) => {
                                const selected = selectedScopeUserIds.includes(scopeUser.id);
                                return (
                                  <label
                                    key={scopeUser.id}
                                    className={cn(
                                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                                      selected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm',
                                    )}
                                  >
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={() => toggleScopeUser(scopeUser.id)}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-bold text-slate-700">{scopeUser.username}</p>
                                      <p className="truncate text-xs text-slate-400 mt-0.5">
                                        {scopeUser.employee_id} <span className="mx-1">·</span> {scopeUser.department?.name || '未分配部门'}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                      {activeModulePermissions.length === 0 ? (
                        <div className="px-4 py-12 text-center text-sm font-medium text-slate-400">当前模块暂无可配置权限</div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {activeModulePermissions.map((permission) => {
                            const permissionState = getPermissionState(permission.code);
                            const checked = permissionState.checked;
                            const loading = isPermissionToggling(permission.code);
                            return (
                              <label
                                key={permission.code}
                                className={cn(
                                  'flex cursor-pointer items-center justify-between gap-4 px-6 py-4 transition-colors',
                                  checked ? 'bg-primary/5 hover:bg-primary/10' : 'bg-transparent hover:bg-slate-50/80',
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800">{permission.name}</p>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{permission.code}</p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {permissionState.fromTemplate && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full bg-slate-100/80 border-transparent text-slate-600 font-medium px-2.5 py-0.5 text-[10px]"
                                      >
                                        角色默认包
                                      </Badge>
                                    )}
                                    {permissionState.allowOverrides.map((override) => (
                                      <Badge
                                        key={`allow-${override.id}`}
                                        variant="outline"
                                        className="rounded-full bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-2.5 py-0.5 text-[10px]"
                                      >
                                        自定义赋权 · {getOverrideSummaryText(
                                          override.scope_type,
                                          override.scope_user_ids,
                                          override.expires_at,
                                        )}
                                      </Badge>
                                    ))}
                                    {permissionState.denyOverrides.map((override) => (
                                      <Badge
                                        key={`deny-${override.id}`}
                                        variant="warning"
                                        className="rounded-full normal-case tracking-normal px-2.5 py-0.5 text-[10px]"
                                      >
                                        自定义禁用 · {getOverrideSummaryText(
                                          override.scope_type,
                                          override.scope_user_ids,
                                          override.expires_at,
                                        )}
                                      </Badge>
                                    ))}
                                  </div>

                                  {!checked && permissionState.denyOverrides.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span className="text-[11px] font-bold text-warning-800">
                                        已通过用户自定义从默认包中禁用
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {loading && <span className="text-xs font-bold text-primary animate-pulse">处理中...</span>}
                                  <Checkbox
                                    checked={checked}
                                    disabled={loading || (
                                      checked
                                        ? !(permissionState.allowOverrides.length > 0 ? canRevokeOverride : canCreateOverride)
                                        : !(permissionState.denyOverrides.length > 0 ? canRevokeOverride : canCreateOverride)
                                    )}
                                    onCheckedChange={(value) => handlePermissionToggle(permission.code, value === true)}
                                  />
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoadingUserOverrides && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
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
