import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Plus,
  Building2,
  Users,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/common/user-avatar';
import { cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/config/role-config';
import { useAuth } from '@/lib/auth-context';
import { USER_ROLE_ASSIGN_PERMISSION } from '@/config/authorization-access';
import {
  getNextAssignableRoleCodes,
  isAssignableRoleCode,
} from '@/utils/authorization/user-role-assignment';

import { useAssignMentor } from '@/features/users/api/assign-mentor';
import { useCreateUser } from '@/features/users/api/create-user';
import { useMentors } from '@/features/users/api/get-mentors';
import { useUpdateUser } from '@/features/users/api/update-user';
import { useAssignRoles } from '@/api/users/assign-roles';
import { useDepartments } from '@/api/users/get-departments';
import { useRoles } from '@/api/users/get-roles';
import { useUserDetail } from '@/api/users/get-user-detail';
import { showApiError } from '@/lib/api-error-handler';
import type { RoleCode } from '@/types/common';
import type { UserList as UserDetail, Mentor, Department, Role } from '@/types/common';

interface UserFormProps {
  open: boolean;
  userId?: number;
  initialDepartmentId?: number;
  initialMentorId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const roleCodeSchema = z.enum([
  'STUDENT',
  'MENTOR',
  'DEPT_MANAGER',
  'ADMIN',
  'TEAM_MANAGER',
  'SUPER_ADMIN',
]);

const createUserFormSchema = (isEdit: boolean) =>
  z
    .object({
      username: z.string().trim().min(1, '此项必填'),
      employee_id: z.string().trim().min(1, '此项必填'),
      password: z.string(),
      department_id: z.number({ error: '请选择部门' }).optional(),
      role_codes: z.array(roleCodeSchema),
      mentor_id: z.number().nullable(),
    })
    .superRefine((values, context) => {
      if (!isEdit && !values.password.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: '设置初始密码',
        });
      }
      if (!values.department_id) {
        context.addIssue({
          code: 'custom',
          path: ['department_id'],
          message: '请选择部门',
        });
      }
    });

type FormData = z.infer<ReturnType<typeof createUserFormSchema>>;

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogContent
        className="max-w-5xl p-0 gap-0 overflow-hidden rounded-xl border border-border flex flex-col bg-background"
      >
        <DialogTitle className="sr-only">
          {isEdit ? '编辑用户档案' : '新建用户档案'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          配置用户基础信息、导师归属与系统角色。
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
            roles={roles}
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

/** 内部表单组件 — 通过 key 重挂载来重置状态 */
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
    const { hasCapability } = useAuth();
    const canCreateUser = hasCapability('user.create');
    const canUpdateUser = hasCapability('user.update');
    const canAssignUserRole = hasCapability(USER_ROLE_ASSIGN_PERMISSION);
    const canSubmitForm = isEdit ? (canUpdateUser || canAssignUserRole) : (canCreateUser && canAssignUserRole);

    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const assignRoles = useAssignRoles();
    const assignMentor = useAssignMentor();
    // 直接从 props 初始化，组件通过 key 重挂载时自动重置
    const [initialRoleCodes] = useState<RoleCode[]>(() =>
      isEdit && userDetail
        ? (
          userDetail.is_superuser
            ? []
            : userDetail.roles.map((role) => role.code).filter(isAssignableRoleCode)
        )
        : [],
    );
    const [initialAssignedMentorId] = useState<number | null>(() =>
      isEdit && userDetail ? (userDetail.mentor?.id || null) : null,
    );

    const form = useForm<FormData>({
      resolver: zodResolver(createUserFormSchema(isEdit)),
      defaultValues: isEdit && userDetail
        ? {
            username: userDetail.username,
            employee_id: userDetail.employee_id,
            password: '',
            department_id: userDetail.department?.id,
            role_codes: initialRoleCodes,
            mentor_id: initialAssignedMentorId,
          }
        : {
            username: '',
            employee_id: '',
            password: '',
            department_id: initialDepartmentId,
            role_codes: [],
            mentor_id: initialMentorId ?? null,
          },
    });
    const formData = useWatch({ control: form.control });
    const [mentorTouched, setMentorTouched] = useState(false);
    const isSuperuserAccount = Boolean(isEdit && userDetail?.is_superuser);
    const canEditBaseInfo = isEdit ? canUpdateUser : canCreateUser;

    const handleSubmit = async (values: FormData) => {
      try {
        if (isEdit) {
          const roleSet = new Set(values.role_codes);
          const initialRoleSet = new Set(initialRoleCodes);
          const rolesChanged =
            roleSet.size !== initialRoleSet.size ||
            [...roleSet].some((code) => !initialRoleSet.has(code));
          const baseInfoChanged = (
            values.username !== (userDetail?.username ?? '')
            || values.employee_id !== (userDetail?.employee_id ?? '')
            || (values.department_id ?? null) !== (userDetail?.department?.id ?? null)
          );
          const mentorChanged = mentorTouched && values.mentor_id !== initialAssignedMentorId;

          if ((baseInfoChanged || mentorChanged) && !canUpdateUser) {
            toast.error('当前账号没有用户资料管理权限，无法提交基础信息变更');
            return;
          }
          if (rolesChanged && !canAssignUserRole) {
            toast.error('当前账号没有用户角色分配权限，无法调整角色');
            return;
          }

          if (baseInfoChanged) {
            await updateUser.mutateAsync({
              id: userId!,
              data: {
                username: values.username,
                employee_id: values.employee_id,
                department_id: values.department_id,
              },
            });
          }
          if (mentorChanged) {
            await assignMentor.mutateAsync({ id: userId!, mentorId: values.mentor_id });
          }
          if (rolesChanged) {
            await assignRoles.mutateAsync({ id: userId!, roles: values.role_codes });
          }
          toast.success("账号信息已更新");
        } else {
          if (!canCreateUser) {
            toast.error('当前账号没有用户资料管理权限，无法创建账号');
            return;
          }
          if (!canAssignUserRole) {
            toast.error('当前账号没有用户角色分配权限，无法分配角色');
            return;
          }
          await createUser.mutateAsync({
            username: values.username,
            employee_id: values.employee_id,
            password: values.password,
            department_id: values.department_id!,
            mentor_id: values.mentor_id,
            role_codes: values.role_codes,
          });
          toast.success("新账号已创建");
        }
        onClose();
        onSuccess?.();
      } catch (error) {
        showApiError(error);
      }
    };

    const toggleRole = (code: RoleCode) => {
      form.setValue(
        'role_codes',
        isSuperuserAccount ? [] : getNextAssignableRoleCodes(form.getValues('role_codes'), code),
        { shouldDirty: true },
      );
    };

    const isRoleToggleDisabled = (): boolean => {
      return isSuperuserAccount;
    };

    const isLoading = form.formState.isSubmitting
      || createUser.isPending
      || updateUser.isPending
      || assignRoles.isPending
      || assignMentor.isPending;

    return (
      <>
        {/* Header */}
        <div className="px-8 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
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

        <div className="flex-1 px-6 pt-6 pb-4 bg-background overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 relative">
            {/* Extremely Subtle Vertical Divider */}
            <div className="hidden lg:block absolute left-1/2 top-4 bottom-4 w-[1px] bg-slate-100/50 -translate-x-1/2" />

            {/* Left Column: Essential Info */}
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 pb-1 text-slate-400">
                <User className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-800">账号基础信息</h3>
              </div>

              <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">真实姓名</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          {...form.register('username')}
                          placeholder="输入姓名"
                          disabled={!canEditBaseInfo}
                          interactionStyle="minimal"
                          className="h-10 bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                        />
                      </div>
                      {form.formState.errors.username && (
                        <p className="text-xs font-bold text-destructive mt-1">
                          {form.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    {/* 2. Employee ID */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">员工工号</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          {...form.register('employee_id')}
                          disabled={!canEditBaseInfo}
                          interactionStyle="minimal"
                          className="h-10 font-mono bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                          placeholder="例如：EMP001"
                        />
                      </div>
                      {form.formState.errors.employee_id && (
                        <p className="text-xs font-bold text-destructive mt-1">
                          {form.formState.errors.employee_id.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. Password */}
                  {!isEdit && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-500 block">初始密码</label>
                      <div className="relative border-b border-slate-100 focus-within:border-primary/50 transition-all">
                        <Input
                          type="password"
                          {...form.register('password')}
                          disabled={!canEditBaseInfo}
                          interactionStyle="minimal"
                          className="h-10 bg-transparent border-none rounded-none px-0 text-sm font-medium text-slate-700 placeholder:text-slate-200 focus-visible:ring-0 shadow-none ring-0 w-full"
                          placeholder="设置 6 位以上密码"
                        />
                      </div>
                      {form.formState.errors.password && (
                        <p className="text-xs font-bold text-destructive mt-1">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Assignments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* 4. Mentor Select */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 text-slate-400">
                      <Users className="w-4 h-4" />
                      <h3 className="text-sm font-bold text-slate-800">带教导师 (可选)</h3>
                    </div>
                    <div className="relative">
                      <Select
                        value={formData.mentor_id?.toString() || ''}
                        disabled={!canEditBaseInfo}
                        onValueChange={(v) => {
                          if (!canEditBaseInfo) return;
                          setMentorTouched(true);
                          form.setValue('mentor_id', v ? Number(v) : null, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isMentorsLoading ? "正在加载导师列表" : "点击选择导师档案"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[9999]">
                          {isMentorsLoading ? (
                            <div className="px-3 py-4 text-sm text-text-muted">正在加载导师列表...</div>
                          ) : isMentorsError ? (
                            <div className="px-3 py-4 text-sm text-destructive">导师列表加载失败，请刷新后重试</div>
                          ) : mentors.filter(m => !userId || m.id !== userId).length === 0 ? (
                            <div className="px-3 py-4 text-sm text-text-muted">当前没有可选导师</div>
                          ) : (
                            mentors.filter(m => !userId || m.id !== userId).map(m => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                <div className="flex items-center gap-3 py-1">
                                  <UserAvatar avatarKey={m.avatar_key} name={m.username} size="sm" />
                                  <span className="text-sm font-medium">{m.username}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {formData.mentor_id && canEditBaseInfo && (
                        <button
                          type="button"
                          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-destructive transition-colors z-[20]"
                          onClick={() => {
                            if (!canEditBaseInfo) return;
                            setMentorTouched(true);
                            form.setValue('mentor_id', null, { shouldDirty: true });
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
                            onClick={() => {
                              if (!canEditBaseInfo) return;
                              form.setValue('department_id', dept.id, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                            className={cn(
                              "px-6 py-2 rounded-full border transition-all duration-300 ease-in-out",
                              canEditBaseInfo ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                              active
                                ? "border-primary text-primary bg-white shadow-sm"
                                : "border-border/70 bg-white text-slate-500 hover:border-primary-200 hover:bg-primary-50/30 hover:text-slate-700"
                            )}
                          >
                            <span className="text-sm font-bold">{dept.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    {form.formState.errors.department_id && (
                      <p className="text-xs font-bold text-destructive">
                        {form.formState.errors.department_id.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Roles */}
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 pb-1 text-slate-400">
                <Shield className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-800">系统角色</h3>
                <span className="text-xs text-slate-400">学员可独立切换，系统角色单选</span>
              </div>

              <div className="mt-4 grid flex-1 grid-cols-1 md:grid-cols-2 gap-3 content-stretch">
                {roles.filter((role) => isAssignableRoleCode(role.code)).map(role => {
                  const roleCode = role.code as RoleCode;
                  const active = (formData.role_codes ?? []).includes(roleCode);
                  const disabled = !canAssignUserRole || isRoleToggleDisabled();
                  const colorConfig = ROLE_COLORS[role.code] || ROLE_COLORS.STUDENT;

                  return (
                    <div
                      key={role.code}
                      onClick={() => !disabled && toggleRole(roleCode)}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-500 cursor-pointer",
                        disabled ? "opacity-20 grayscale cursor-not-allowed" : "active:scale-[0.98]",
                        active
                          ? `${colorConfig.bgClass} ${colorConfig.borderClass}`
                          : "border-border/60 bg-white hover:bg-muted/35"
                      )}
                    >
                      {/* Background Minimal Icon */}
                      <div className={cn(
                        "absolute -right-3 -bottom-5 transition-all duration-700",
                        active ? cn("opacity-[0.2] scale-110", colorConfig.mutedTextClass) : "opacity-[0.3] scale-100 text-slate-200"
                      )}>
                        {role.code === 'ADMIN' || role.code === 'SUPER_ADMIN' ? <Shield className="w-24 h-24" strokeWidth={0.5} /> :
                          role.code === 'DEPT_MANAGER' ? <Building2 className="w-24 h-24" strokeWidth={0.5} /> :
                            role.code === 'TEAM_MANAGER' ? <Users className="w-24 h-24" strokeWidth={0.5} /> :
                              <User className="w-24 h-24" strokeWidth={0.5} />}
                      </div>

                      <div className="relative z-10 flex flex-col gap-1">
                        <p className={cn(
                          "text-sm font-bold transition-all duration-300",
                          active ? colorConfig.mutedTextClass : "text-slate-600"
                        )}>{role.name}</p>
                        <p className={cn(
                          "text-[10px] font-bold transition-all duration-300 opacity-60",
                          active ? colorConfig.mutedTextClass : "text-slate-300"
                        )}>
                          {role.code === 'ADMIN' || role.code === 'SUPER_ADMIN' ? '全系统最高管理权限' :
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

        {/* Footer - Aligned with Grid */}
        <div className="px-8 pb-3 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-3 border-t border-slate-100">
            <div className="hidden lg:block" />
            <div className="flex items-center justify-end gap-6">
              <button
                onClick={onClose}
                className="text-sm font-bold text-slate-300 hover:text-slate-500 transition-colors"
              >
                取消
              </button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading || !canSubmitForm}
                className="h-10 px-9 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:translate-y-[1px] disabled:opacity-50"
              >
                {isLoading ? "处理中..." : isEdit ? "更新" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  };
