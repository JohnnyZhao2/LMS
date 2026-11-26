import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogDescription, DialogTitle, DrawerContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/users/user-avatar';
import { DATA_SCOPE_LABELS, LEARNER_ROLE_VALUE, USER_ROLE_ASSIGN_PERMISSION } from '@/config/authorization';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/lib/auth';
import {
  composeRoleCodes,
  getPrimaryIdentity,
  getSpecialtyRoleCodes,
  isBuiltinPrimaryRole,
  type PrimaryIdentityValue,
} from '@/lib/user-role-assignment';
import { cn } from '@/lib/utils';
import { useDepartments, useMentors, useRoles, useUserDetail } from '@/api/users/get-users';
import { useAssignMentor, useAssignRoles, useCreateUser, useUpdateUser } from '@/api/users/manage-users';
import { showApiError } from '@/utils/error-handler';
import type { Role, RoleCode, UserList as UserDetail } from '@/types/common';

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
  primary_identity: PrimaryIdentityValue;
  specialty_role_codes: RoleCode[];
  mentor_id: number | null;
}

interface FormErrors {
  username?: string;
  employee_id?: string;
  password?: string;
  department_id?: string;
}

const FIELD_INPUT_CLASS = 'h-10 text-sm';
const FIELD_LABEL_CLASS = 'text-xs font-semibold text-text-muted';

const FormField: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div>
    <label className={cn('mb-1.5 block', FIELD_LABEL_CLASS)}>{label}</label>
    {children}
    {error ? <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p> : null}
  </div>
);

export const UserForm: React.FC<UserFormProps> = ({
  open,
  userId,
  initialDepartmentId,
  initialMentorId,
  onClose,
  onSuccess,
}) => {
  const { data: userDetail, isError: isUserDetailError } = useUserDetail(userId || 0);
  const isEdit = Boolean(userId);
  const bodyKey = isEdit
    ? `edit-${userId}-${userDetail?.updated_at ?? 'loading'}`
    : `new-${initialDepartmentId ?? 'none'}-${initialMentorId ?? 'none'}`;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DrawerContent className="max-w-[460px]">
        <DialogTitle className="sr-only">{isEdit ? '编辑用户' : '新建用户'}</DialogTitle>
        <DialogDescription className="sr-only">用户资料与角色配置</DialogDescription>
        {open ? (
          isEdit && !userDetail ? (
            isUserDetailError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-7 text-sm text-text-muted">
                <p>加载用户信息失败，请关闭重试</p>
                <Button type="button" variant="outline" size="sm" onClick={onClose}>关闭</Button>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-6 px-7 py-6">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                </div>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            )
          ) : (
            <UserDrawerBody
              key={bodyKey}
              userId={userId}
              userDetail={userDetail}
              initialDepartmentId={initialDepartmentId}
              initialMentorId={initialMentorId}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          )
        ) : null}
      </DrawerContent>
    </Dialog>
  );
};

interface UserDrawerBodyProps {
  userId?: number;
  userDetail?: UserDetail;
  initialDepartmentId?: number;
  initialMentorId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const UserDrawerBody: React.FC<UserDrawerBodyProps> = ({
  userId,
  userDetail,
  initialDepartmentId,
  initialMentorId,
  onClose,
  onSuccess,
}) => {
  const isEdit = Boolean(userId);
  const navigate = useNavigate();
  const { hasCapability, user } = useAuth();
  const { data: mentors = [], isLoading: isMentorsLoading, isError: isMentorsError } = useMentors();
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();

  const isSuperuser = Boolean(user?.is_superuser);
  const canCreateUser = isSuperuser || hasCapability('users.add_user');
  const canUpdateUser = isSuperuser || hasCapability('users.change_user');
  const canEditBaseInfo = isEdit ? canUpdateUser : canCreateUser;
  const canAssignUserRole = isSuperuser || hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canAssignRole = (role: Role) => role.code !== 'ADMIN' || isSuperuser;
  const canSubmitForm = isEdit ? (canUpdateUser || canAssignUserRole) : canCreateUser;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();

  const getDeptManager = (deptId?: number) => (
    deptId ? departments.find((d) => d.id === deptId && d.manager_id && d.manager_name) : undefined
  );

  const initialSavedRoleCodes: RoleCode[] = isEdit && userDetail && !userDetail.is_superuser
    ? userDetail.roles.map((role) => role.code)
    : [];
  const initialSavedMentorId: number | null = isEdit && userDetail ? (userDetail.mentor?.id || null) : null;

  const savedRef = useRef({
    username: userDetail?.username ?? '',
    employee_id: userDetail?.employee_id ?? '',
    department_id: userDetail?.department?.id ?? null,
    role_codes: initialSavedRoleCodes,
    mentor_id: initialSavedMentorId,
  });

  const [formData, setFormData] = useState<FormData>(() => (
    isEdit && userDetail
      ? {
        username: userDetail.username,
        employee_id: userDetail.employee_id,
        password: '',
        department_id: userDetail.department?.id,
        primary_identity: getPrimaryIdentity(initialSavedRoleCodes),
        specialty_role_codes: getSpecialtyRoleCodes(initialSavedRoleCodes),
        mentor_id: initialSavedMentorId,
      }
      : {
        username: '',
        employee_id: '',
        password: '',
        department_id: initialDepartmentId,
        primary_identity: LEARNER_ROLE_VALUE,
        specialty_role_codes: [],
        mentor_id: initialMentorId ?? null,
      }
  ));

  const [mentorTouched, setMentorTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const effectiveDepartmentId = isEdit
    ? formData.department_id
    : (formData.department_id ?? initialDepartmentId ?? departments[0]?.id);
  const isSuperuserAccount = Boolean(isEdit && userDetail?.is_superuser);
  const roleByCode = new Map(roles.map((role) => [role.code, role]));
  const activeSpecialtyRoles = roles.filter((role) => !role.is_builtin && !isBuiltinPrimaryRole(role.code) && role.is_active !== false);
  const activeSpecialtyCodes = new Set(activeSpecialtyRoles.map((role) => role.code));
  const assignedInactiveSpecialtyRoles = (userDetail?.roles ?? [])
    .filter((role) => !role.is_builtin && !isBuiltinPrimaryRole(role.code) && role.is_active === false && !activeSpecialtyCodes.has(role.code))
    .map((role) => ({ ...role, is_active: false }));
  const specialtyRoles = [...activeSpecialtyRoles, ...assignedInactiveSpecialtyRoles];
  const selectableMentors = mentors.filter((m) => !userId || m.id !== userId);

  const existingDeptManagerDept = getDeptManager(effectiveDepartmentId);
  const deptManagerOccupiedByOther = Boolean(existingDeptManagerDept && existingDeptManagerDept.manager_id !== userDetail?.id);

  const isSelfAccount = Boolean(isEdit && userDetail?.id && user?.id && userDetail.id === user.id);
  const isAdminAccountLocked = Boolean(isEdit && !isSuperuser && initialSavedRoleCodes.includes('ADMIN'));
  const roleControlDisabled = !canAssignUserRole || isSuperuserAccount || isAdminAccountLocked || (!isSuperuser && isSelfAccount);

  const primaryOptions: SegmentedOption[] = [
    { value: LEARNER_ROLE_VALUE, label: '普通学员', disabled: roleControlDisabled },
    ...(['MENTOR', 'DEPT_MANAGER', 'ADMIN'] as const)
      .filter((code) => roleByCode.has(code))
      .map((code) => {
        const role = roleByCode.get(code)!;
        const deptBlocked = code === 'DEPT_MANAGER' && (!effectiveDepartmentId || deptManagerOccupiedByOther);
        return { value: code, label: role.name, disabled: roleControlDisabled || !canAssignRole(role) || deptBlocked };
      }),
  ];

  const departmentOptions: SegmentedOption[] = departments.map((dept) => ({
    value: dept.id.toString(),
    label: dept.name,
    disabled: !canEditBaseInfo,
  }));

  const resolvedRoleCodes = isSuperuserAccount
    ? []
    : composeRoleCodes(formData.primary_identity, formData.specialty_role_codes);

  const updateTextField = (key: 'username' | 'employee_id' | 'password', value: string) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSpecialtyRole = (code: RoleCode) => {
    setFormData((prev) => ({
      ...prev,
      specialty_role_codes: prev.specialty_role_codes.includes(code)
        ? prev.specialty_role_codes.filter((item) => item !== code)
        : [...prev.specialty_role_codes, code],
    }));
  };

  const handleDepartmentChange = (deptIdStr: string) => {
    if (!canEditBaseInfo) return;
    const deptId = Number(deptIdStr);
    const dept = getDeptManager(deptId);
    const occupied = Boolean(dept && dept.manager_id !== userDetail?.id);
    setErrors((prev) => ({ ...prev, department_id: undefined }));
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      primary_identity: !roleControlDisabled && occupied && prev.primary_identity === 'DEPT_MANAGER'
        ? LEARNER_ROLE_VALUE
        : prev.primary_identity,
    }));
  };

  const validate = (): boolean => {
    if (isEdit && !canEditBaseInfo) return true;
    const newErrors: FormErrors = {};
    if (!formData.username.trim()) newErrors.username = '请输入姓名';
    if (!formData.employee_id.trim()) newErrors.employee_id = '请输入工号';
    if (!isEdit && !formData.password.trim()) newErrors.password = '请设置初始密码';
    if (!effectiveDepartmentId) newErrors.department_id = '请选择部门';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSubmitting || !validate()) return;
    setIsSubmitting(true);
    try {
      const trimmedUsername = formData.username.trim();
      const trimmedEmployeeId = formData.employee_id.trim();
      if (isEdit) {
        const saved = savedRef.current;
        const nextSet = new Set(resolvedRoleCodes);
        const initialSet = new Set(saved.role_codes);
        const rolesChanged = nextSet.size !== initialSet.size || [...nextSet].some((code) => !initialSet.has(code));
        const baseInfoChanged = canEditBaseInfo && (
          trimmedUsername !== saved.username
          || trimmedEmployeeId !== saved.employee_id
          || (effectiveDepartmentId ?? null) !== saved.department_id
        );
        const mentorChanged = canEditBaseInfo && mentorTouched && formData.mentor_id !== saved.mentor_id;

        if (baseInfoChanged) {
          await updateUser.mutateAsync({
            id: userId!,
            data: {
              username: trimmedUsername,
              employee_id: trimmedEmployeeId,
              department_id: effectiveDepartmentId,
              ...(rolesChanged ? { role_codes: resolvedRoleCodes } : {}),
            },
          });
          saved.username = trimmedUsername;
          saved.employee_id = trimmedEmployeeId;
          saved.department_id = effectiveDepartmentId ?? null;
          if (rolesChanged) saved.role_codes = resolvedRoleCodes;
        } else if (rolesChanged) {
          await assignRoles.mutateAsync({ id: userId!, roles: resolvedRoleCodes });
          saved.role_codes = resolvedRoleCodes;
        }
        if (mentorChanged) {
          await assignMentor.mutateAsync({ id: userId!, mentorId: formData.mentor_id });
          saved.mentor_id = formData.mentor_id;
          setMentorTouched(false);
        }
        toast.success('已保存');
      } else {
        await createUser.mutateAsync({
          username: trimmedUsername,
          employee_id: trimmedEmployeeId,
          password: formData.password,
          department_id: effectiveDepartmentId!,
          mentor_id: formData.mentor_id,
          role_codes: resolvedRoleCodes,
        });
        toast.success('已创建');
      }
      onClose();
      onSuccess?.();
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/60 px-7 py-5 pr-16">
        {isEdit && userDetail ? (
          <div className="flex items-center gap-3.5">
            <UserAvatar avatarKey={userDetail.avatar_key} name={userDetail.username} size="md" className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-foreground">{userDetail.username}</h2>
              <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
                <span className="font-mono">{userDetail.employee_id}</span>
                {userDetail.department?.name ? ` · ${userDetail.department.name}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <h2 className="text-xl font-bold tracking-tight text-foreground">新建用户</h2>
        )}
      </header>

      <ScrollContainer className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="姓名" error={errors.username}>
              <Input
                value={formData.username}
                onChange={(e) => updateTextField('username', e.target.value)}
                placeholder="输入姓名"
                disabled={!canEditBaseInfo}
                className={FIELD_INPUT_CLASS}
              />
            </FormField>

            <FormField label="工号" error={errors.employee_id}>
              <Input
                value={formData.employee_id}
                onChange={(e) => updateTextField('employee_id', e.target.value)}
                placeholder="EMP001"
                disabled={!canEditBaseInfo}
                className={cn(FIELD_INPUT_CLASS, 'font-mono')}
              />
            </FormField>
          </div>

          {!isEdit ? (
            <FormField label="初始密码" error={errors.password}>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => updateTextField('password', e.target.value)}
                placeholder="6 位以上密码"
                disabled={!canEditBaseInfo}
                className={FIELD_INPUT_CLASS}
              />
            </FormField>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="所属部门" error={errors.department_id}>
              <SegmentedControl options={departmentOptions} value={effectiveDepartmentId?.toString() ?? null} onChange={handleDepartmentChange} fill className="w-full" />
            </FormField>

            <FormField label="带教导师">
              <div className="relative">
                <Select
                  value={formData.mentor_id?.toString() || ''}
                  disabled={!canEditBaseInfo}
                  onValueChange={(value) => {
                    if (!canEditBaseInfo) return;
                    setMentorTouched(true);
                    setFormData({ ...formData, mentor_id: value ? Number(value) : null });
                  }}
                >
                  <SelectTrigger className="rounded-lg text-left [&>span]:text-left">
                    <SelectValue placeholder={isMentorsLoading ? '加载中...' : '未分配'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 z-[9999]">
                    {isMentorsLoading || isMentorsError || selectableMentors.length === 0 ? (
                      <div className={cn('px-3 py-3 text-sm', isMentorsError ? 'text-destructive' : 'text-text-muted')}>
                        {isMentorsLoading ? '加载中...' : isMentorsError ? '加载失败' : '无可选导师'}
                      </div>
                    ) : (
                      selectableMentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id.toString()}>
                          <div className="flex items-center gap-2.5 py-0.5">
                            <UserAvatar avatarKey={mentor.avatar_key} name={mentor.username} size="sm" />
                            <span className="text-sm font-medium">{mentor.username}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.mentor_id && canEditBaseInfo ? (
                  <button
                    type="button"
                    aria-label="清除导师"
                    className="absolute right-9 top-1/2 z-20 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-destructive"
                    onClick={() => {
                      setMentorTouched(true);
                      setFormData({ ...formData, mentor_id: null });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </FormField>
          </div>

          <div className="h-px bg-border/60" />

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className={FIELD_LABEL_CLASS}>常规身份</label>
              {deptManagerOccupiedByOther && formData.primary_identity !== 'DEPT_MANAGER' ? (
                <span className="text-xs font-medium text-amber-600">室经理：{existingDeptManagerDept?.manager_name}</span>
              ) : null}
            </div>
            <SegmentedControl
              options={primaryOptions}
              value={formData.primary_identity}
              onChange={(nextValue) => {
                if (roleControlDisabled) return;
                const primary = nextValue as PrimaryIdentityValue;
                setFormData((prev) => ({
                  ...prev,
                  primary_identity: primary,
                  specialty_role_codes: primary === 'ADMIN' ? [] : prev.specialty_role_codes,
                }));
              }}
              fill
              className="w-full"
            />
          </div>

          {formData.primary_identity !== 'ADMIN' ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className={FIELD_LABEL_CLASS}>专项角色</label>
                {canAssignUserRole ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(ROUTES.AUTHORIZATION);
                    }}
                    className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                  >
                    管理角色
                  </button>
                ) : null}
              </div>

              {specialtyRoles.length === 0 ? (
                <div className="flex h-10 items-center rounded-lg border border-dashed border-border px-3.5 text-sm text-text-muted">
                  暂无专项角色
                </div>
              ) : (
                <div className="space-y-2">
                  {specialtyRoles.map((role) => {
                    const checked = formData.specialty_role_codes.includes(role.code);
                    const isInactiveRole = role.is_active === false;
                    const disabled = roleControlDisabled || !canAssignRole(role) || (isInactiveRole && !checked);

                    return (
                      <label
                        key={role.code}
                        className={cn(
                          'flex h-11 items-center justify-between gap-3 rounded-lg border px-3.5 transition-colors',
                          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                          checked ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:bg-muted/40',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => { if (!disabled) toggleSpecialtyRole(role.code); }}
                          />
                          <span className="truncate text-sm font-medium text-foreground">{role.name}</span>
                          {isInactiveRole ? (
                            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">已停用</span>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs text-text-muted">{DATA_SCOPE_LABELS[role.data_scope]}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </ScrollContainer>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-background px-7 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>取消</Button>
        <Button type="submit" disabled={isSubmitting || !canSubmitForm}>
          {isSubmitting ? '保存中...' : isEdit ? '保存' : '创建'}
        </Button>
      </footer>
    </form>
  );
};
