import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Building2,
  Users,
  Briefcase,
  Pencil,
  Plus,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // DialogClose removed to avoid duplication with default Close button
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import { useCreateUser, useUpdateUser, useAssignRoles, useAssignMentor } from '../api/manage-users';
import { useUserDetail, useMentors, useDepartments, useRoles } from '../api/get-users';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';

interface UserFormProps {
  open: boolean;
  userId?: number;
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

/**
 * 用户表单组件
 */
export const UserForm: React.FC<UserFormProps> = ({
  open,
  userId,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!userId;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();
  const { data: userDetail } = useUserDetail(userId || 0);
  const { data: mentors = [] } = useMentors();
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    employee_id: '',
    password: '',
    department_id: undefined,
    role_codes: [],
    mentor_id: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      if (isEdit && userDetail) {
        setFormData({
          username: userDetail.username,
          employee_id: userDetail.employee_id,
          password: '',
          department_id: userDetail.department?.id,
          role_codes: userDetail.roles.filter((r) => r.code !== 'STUDENT').map((r) => r.code as RoleCode),
          mentor_id: userDetail.mentor?.id || null,
        });
      } else {
        setFormData({
          username: '',
          employee_id: '',
          password: '',
          department_id: undefined,
          role_codes: [],
          mentor_id: null,
        });
      }
      setErrors({});
    }
  }, [open, isEdit, userDetail]);

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
        await updateUser.mutateAsync({
          id: userId!,
          data: { username: formData.username, employee_id: formData.employee_id, department_id: formData.department_id },
        });
        await assignRoles.mutateAsync({ id: userId!, roles: formData.role_codes });
        if (userDetail?.mentor?.id !== formData.mentor_id) {
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

  // Role Configuration - refined style
  const roleConfigs: Record<string, { bg: string, text: string, icon: React.ReactNode, ring: string }> = {
    ADMIN: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-500/20', icon: <Shield className="w-4 h-4" /> },
    DEPT_MANAGER: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-500/20', icon: <Building2 className="w-4 h-4" /> },
    MENTOR: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-500/20', icon: <Briefcase className="w-4 h-4" /> },
    TEAM_MANAGER: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-500/20', icon: <Users className="w-4 h-4" /> },
    STUDENT: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-500/20', icon: <User className="w-4 h-4" /> },
  };

  const toggleRole = (code: RoleCode) => {
    setFormData(prev => ({
      ...prev,
      role_codes: prev.role_codes.includes(code)
        ? prev.role_codes.filter(c => c !== code)
        : [...prev.role_codes, code],
    }));
  };

  const isLoading = createUser.isPending || updateUser.isPending || assignRoles.isPending || assignMentor.isPending;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-lg border border-[#E5E7EB] h-[85vh] flex flex-col bg-white">

        {/* Header */}
        <DialogHeader className="px-8 py-6 shrink-0 border-b border-[#E5E7EB]">
          <DialogTitle className="text-2xl font-bold text-[#111827] flex items-center gap-4 tracking-tight">
            <div className={cn(
              "w-14 h-14 rounded-lg flex items-center justify-center text-white",
              isEdit ? "bg-[#DC2626]" : "bg-[#10B981]"
            )}>
              {isEdit ? <Pencil className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
            </div>
            {isEdit ? '编辑成员档案' : '邀请新成员'}
            {isEdit && (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#D1FAE5] text-[#10B981]">
                Active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-white">

          {/* 1. Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#3B82F6]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wider">基础信息</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">真实姓名</label>
                <Input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="请输入姓名"
                />
                {errors.username && <p className="text-xs font-medium text-[#DC2626]">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">员工工号</label>
                <Input
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  className="font-mono"
                  placeholder="E.g. EMP001"
                />
                {errors.employee_id && <p className="text-xs font-medium text-[#DC2626]">{errors.employee_id}</p>}
              </div>

              {!isEdit && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">初始密码</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="tracking-widest"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-xs font-medium text-[#DC2626]">{errors.password}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-[#E5E7EB]" />

          {/* 2. Organization */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wider">组织归属</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">选择部门</label>
                <div className="grid grid-cols-2 gap-3">
                  {departments.map(dept => {
                    const active = formData.department_id === dept.id;
                    return (
                      <div
                        key={dept.id}
                        onClick={() => setFormData({ ...formData, department_id: dept.id })}
                        className={cn(
                          "cursor-pointer group flex items-center justify-center gap-2 px-4 h-14 rounded-md transition-all duration-200",
                          active
                            ? "bg-[#10B981] text-white"
                            : "bg-[#F3F4F6] border-0 text-[#111827] hover:bg-[#E5E7EB]"
                        )}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {dept.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {errors.department_id && <p className="text-xs font-medium text-[#DC2626]">{errors.department_id}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">分配导师 (可选)</label>
                <Select
                  value={formData.mentor_id?.toString() || ''}
                  onValueChange={(v) => setFormData({ ...formData, mentor_id: v ? Number(v) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择带教导师..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 z-[9999]" sideOffset={8}>
                    {mentors.filter(m => !userId || m.id !== userId).map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-full">
                            <AvatarFallback className="bg-[#3B82F6] text-white text-xs font-bold">
                              {getAvatarText(m.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[#111827]">{m.username}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-[#E5E7EB]" />

          {/* 3. Roles */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#F59E0B]" />
              <h3 className="text-base font-bold text-[#111827] tracking-tight">系统权限</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Role */}
              <div className="flex items-center gap-4 p-5 rounded-lg bg-[#F3F4F6] opacity-60">
                <div className="w-12 h-12 rounded-lg bg-white text-[#9CA3AF] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#6B7280]">普通学员</span>
                  <span className="text-xs text-[#9CA3AF] font-semibold uppercase mt-0.5 tracking-wider">Default</span>
                </div>
              </div>

              {/* Selectable Roles */}
              {roles.filter(r => r.code !== 'STUDENT').map(role => {
                const config = roleConfigs[role.code] || roleConfigs.STUDENT;
                const active = formData.role_codes.includes(role.code as RoleCode);

                // Map role codes to flat design colors
                const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
                  ADMIN: { bg: "#DC2626", text: "#DC2626", iconBg: "#DC2626" },
                  MENTOR: { bg: "#F59E0B", text: "#F59E0B", iconBg: "#F59E0B" },
                  TEAM_MANAGER: { bg: "#0EA5E9", text: "#0EA5E9", iconBg: "#0EA5E9" },
                  DEPT_MANAGER: { bg: "#7C3AED", text: "#7C3AED", iconBg: "#7C3AED" },
                  ROOM_MANAGER: { bg: "#7C3AED", text: "#7C3AED", iconBg: "#7C3AED" }
                };
                const colorConfig = colorMap[role.code] || { bg: "#3B82F6", text: "#3B82F6", iconBg: "#3B82F6" };

                return (
                  <div
                    key={role.code}
                    onClick={() => toggleRole(role.code as RoleCode)}
                    className={cn(
                      "group cursor-pointer relative flex items-center gap-4 p-5 rounded-lg transition-all duration-200",
                      active
                        ? "bg-white border-2"
                        : "bg-[#F3F4F6] border-2 border-transparent hover:bg-white hover:scale-[1.02]"
                    )}
                    style={active ? { borderColor: colorConfig.bg } : {}}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0",
                      active
                        ? "text-white"
                        : "bg-white text-[#6B7280] group-hover:text-[#111827]"
                    )}
                      style={active ? { backgroundColor: colorConfig.iconBg } : {}}
                    >
                      {config.icon}
                    </div>

                    <div className="flex-1">
                      <div className={cn(
                        "text-base font-bold transition-colors",
                        active ? colorConfig.text : "text-[#6B7280] group-hover:text-[#111827]"
                      )}>
                        {role.name}
                      </div>
                      {active && <div className="text-[10px] font-semibold uppercase text-[#6B7280] tracking-wider">Enabled</div>}
                    </div>

                    {active && (
                      <div className="absolute top-4 right-4 w-3 h-3 rounded-full" style={{ backgroundColor: "#10B981" }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-8 py-6 border-t border-[#E5E7EB] bg-white shrink-0 sm:justify-end gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-14 px-8 rounded-md font-semibold text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all duration-200"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto h-14 px-10 rounded-md bg-[#3B82F6] text-white font-semibold text-base hover:bg-[#2563EB] hover:scale-105 transition-all duration-200"
          >
            {isLoading ? "提交中..." : isEdit ? "保存更改" : "立即邀请"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
