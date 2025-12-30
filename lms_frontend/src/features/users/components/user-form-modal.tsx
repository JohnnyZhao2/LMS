import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Building2,
  Users,
  Briefcase,
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

interface UserFormModalProps {
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

export const UserFormModal: React.FC<UserFormModalProps> = ({
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
        await createUser.mutateAsync({
          username: formData.username,
          employee_id: formData.employee_id,
          password: formData.password,
          department_id: formData.department_id!,
          mentor_id: formData.mentor_id,
        });
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
      {/* 
        Modified: 
        1. max-w-3xl for a more focused modal width (4xl was too wide).
        2. Added [&>button]:hidden to DialogContent to hide default close button if desired, 
           BUT user complained about 'double X', so we keep default and REMOVE our custom one.
      */}
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[24px] border-none shadow-2xl h-[85vh] flex flex-col bg-white">

        {/* Header - Simplified to match page headers */}
        <DialogHeader className="px-6 py-4 shrink-0 bg-white border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-3">
            {isEdit ? '编辑成员档案' : '邀请新成员'}
            {isEdit && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content - Clean White Background */}
        <div className="flex-1 overflow-y-auto bg-white p-6 space-y-6">

          {/* 1. Basic Info Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/60">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h3 className="text-base font-bold text-gray-900">基础信息</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="h-14 rounded-2xl bg-white border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:ring-2 focus:ring-primary-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium px-4"
                  placeholder="真实姓名"
                />
                {errors.username && <p className="text-xs font-bold text-red-500 mt-1 ml-1">{errors.username}</p>}
              </div>

              <div>
                <Input
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  className="h-14 rounded-2xl bg-white border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:ring-2 focus:ring-primary-500/10 transition-all font-mono font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium px-4"
                  placeholder="员工工号 (E.g. EMP001)"
                />
                {errors.employee_id && <p className="text-xs font-bold text-red-500 mt-1 ml-1">{errors.employee_id}</p>}
              </div>

              {!isEdit && (
                <div className="md:col-span-2">
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="h-14 rounded-2xl bg-white border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:ring-2 focus:ring-primary-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium px-4"
                    placeholder="设置初始密码"
                  />
                  {errors.password && <p className="text-xs font-bold text-red-500 mt-1 ml-1">{errors.password}</p>}
                </div>
              )}
            </div>
          </div>

          {/* 2. Organization Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/60">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h3 className="text-base font-bold text-gray-900">组织归属</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                {/* No Label, context provided by icon/layout */}
                <div className="grid grid-cols-2 gap-3">
                  {departments.map(dept => {
                    const active = formData.department_id === dept.id;
                    return (
                      <div
                        key={dept.id}
                        onClick={() => setFormData({ ...formData, department_id: dept.id })}
                        className={cn(
                          "cursor-pointer group relative flex flex-1 items-center justify-center gap-2 px-4 h-14 rounded-2xl transition-all duration-300 ease-out min-w-[100px]",
                          active
                            ? "bg-purple-50 shadow-lg shadow-purple-500/20 -translate-y-0.5"
                            : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0",
                          active ? "bg-white text-purple-600 shadow-sm" : "bg-purple-50 text-purple-400 group-hover:bg-purple-100"
                        )}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className={cn(
                          "text-sm font-bold transition-colors whitespace-nowrap",
                          active ? "text-purple-900" : "text-gray-600 group-hover:text-gray-900"
                        )}>
                          {dept.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {errors.department_id && <p className="text-xs font-bold text-red-500 ml-1">{errors.department_id}</p>}
              </div>

              <div>
                {/* No Label */}
                <Select
                  value={formData.mentor_id?.toString() || ''}
                  onValueChange={(v) => setFormData({ ...formData, mentor_id: v ? Number(v) : null })}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:ring-2 focus:ring-purple-500/10 transition-all font-medium text-gray-700 px-4">
                    <SelectValue placeholder="带教导师 (可选)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl border border-gray-100 shadow-xl z-[9999]" sideOffset={5}>
                    <div className="p-1">
                      {mentors.filter(m => !userId || m.id !== userId).map(m => (
                        <SelectItem key={m.id} value={m.id.toString()} className="rounded-lg py-2.5 px-3 my-0.5 cursor-pointer focus:bg-purple-50 focus:text-purple-900 data-[state=checked]:bg-purple-50 data-[state=checked]:text-purple-900">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-gray-100">
                              <AvatarFallback className="bg-purple-50 text-purple-600 text-[10px] font-bold">
                                {getAvatarText(m.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm">{m.username}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 3. Roles Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/60">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full bg-green-500" />
              <h3 className="text-base font-bold text-gray-900">系统权限</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Role */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/80 border border-transparent">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-500">普通学员</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">基础权限</span>
                </div>
              </div>

              {/* Selectable Roles */}
              {roles.filter(r => r.code !== 'STUDENT').map(role => {
                const config = roleConfigs[role.code] || roleConfigs.STUDENT;
                const active = formData.role_codes.includes(role.code as RoleCode);

                // Map role codes to specific solid colors for active state borders/text
                const colorMap: Record<string, string> = {
                  ADMIN: "red",
                  MENTOR: "amber", // Changed to amber to match config
                  TEAM_MANAGER: "cyan",
                  DEPT_MANAGER: "purple", // Fixed key from ROOM_MANAGER to DEPT_MANAGER to match roleConfigs
                  ROOM_MANAGER: "purple"  // Kept for fallback
                };
                const color = colorMap[role.code] || "blue";

                return (
                  <div
                    key={role.code}
                    onClick={() => toggleRole(role.code as RoleCode)}
                    className={cn(
                      "group cursor-pointer relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 ease-out",
                      active
                        ? `bg-${color}-50 shadow-lg shadow-${color}-500/20 -translate-y-0.5`
                        : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                      active
                        ? `bg-white text-${color}-600 shadow-sm`
                        : `bg-${color}-50 text-${color}-500 group-hover:bg-${color}-100`
                    )}>
                      {config.icon}
                    </div>

                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-bold transition-colors",
                        active ? `text-${color}-900` : "text-gray-700"
                      )}>
                        {role.name}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-8 py-5 border-t border-gray-100 bg-white shrink-0 sm:justify-end">
          {/* Removed redundant 'Cancel' to minimize noise as requested by user */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-base hover:from-primary-700 hover:to-indigo-700 hover:scale-[1.02] transition-all shadow-xl shadow-primary-500/20"
          >
            {isLoading ? "提交中..." : isEdit ? "保存更改" : "立即创建成员"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
