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
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none h-[85vh] flex flex-col bg-white shadow-2xl">

        {/* Header - Clean White */}
        <DialogHeader className="px-10 py-8 shrink-0 border-b border-gray-100">
          <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-4 tracking-tight" style={{ fontFamily: "Nunito, sans-serif" }}>
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white",
              isEdit ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-emerald-400 to-emerald-600"
            )}>
              {isEdit ? <Pencil className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
            </div>
            {isEdit ? '编辑成员档案' : '邀请新成员'}
            {isEdit && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600">
                Active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 scrollbar-hide bg-white">

          {/* 1. Basic Info */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">基础信息</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">真实姓名</label>
                <Input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all font-medium text-base px-4"
                  placeholder="请输入姓名"
                />
                {errors.username && <p className="text-xs font-medium text-red-500 ml-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">员工工号</label>
                <Input
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all font-mono font-medium text-base px-4"
                  placeholder="E.g. EMP001"
                />
                {errors.employee_id && <p className="text-xs font-medium text-red-500 ml-1">{errors.employee_id}</p>}
              </div>

              {!isEdit && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">初始密码</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="h-14 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all font-medium text-base px-4 tracking-widest"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-xs font-medium text-red-500 ml-1">{errors.password}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* 2. Organization */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-pink-500" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">组织归属</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">选择部门</label>
                <div className="grid grid-cols-2 gap-3">
                  {departments.map(dept => {
                    const active = formData.department_id === dept.id;
                    return (
                      <div
                        key={dept.id}
                        onClick={() => setFormData({ ...formData, department_id: dept.id })}
                        className={cn(
                          "cursor-pointer group flex items-center justify-center gap-2 px-4 h-12 rounded-xl transition-all",
                          active
                            ? "bg-pink-500 text-white shadow-md"
                            : "bg-gray-50 border border-gray-100 text-gray-700 hover:border-pink-200 hover:bg-pink-50"
                        )}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm font-bold whitespace-nowrap">
                          {dept.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {errors.department_id && <p className="text-xs font-medium text-red-500 ml-1">{errors.department_id}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">分配导师 (可选)</label>
                <Select
                  value={formData.mentor_id?.toString() || ''}
                  onValueChange={(v) => setFormData({ ...formData, mentor_id: v ? Number(v) : null })}
                >
                  <SelectTrigger className="h-14 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 focus:ring-4 focus:ring-purple-100 transition-all font-medium text-gray-900 px-4 text-base">
                    <SelectValue placeholder="选择带教导师..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl border border-gray-100 shadow-xl z-[9999] bg-white p-2" sideOffset={8}>
                    {mentors.filter(m => !userId || m.id !== userId).map(m => (
                      <SelectItem key={m.id} value={m.id.toString()} className="rounded-lg py-3 px-4 my-0.5 cursor-pointer focus:bg-purple-50 data-[state=checked]:bg-purple-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-full">
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                              {getAvatarText(m.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{m.username}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* 3. Roles - Clay Style */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-clay-tertiary to-sky-400" />
              <h3 className="text-lg font-black text-clay-foreground tracking-tight" style={{ fontFamily: "Nunito, sans-serif" }}>系统权限</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pl-4">
              {/* Default Role */}
              <div className="flex items-center gap-4 p-5 rounded-3xl bg-clay-muted/8 opacity-60">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm text-clay-muted flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black text-clay-muted" style={{ fontFamily: "Nunito, sans-serif" }}>普通学员</span>
                  <span className="text-xs text-clay-muted/80 font-bold uppercase mt-0.5 tracking-widest">Default</span>
                </div>
              </div>

              {/* Selectable Roles */}
              {roles.filter(r => r.code !== 'STUDENT').map(role => {
                const config = roleConfigs[role.code] || roleConfigs.STUDENT;
                const active = formData.role_codes.includes(role.code as RoleCode);

                // Map role codes to candy-shop gradient colors
                const colorMap: Record<string, { gradient: string; text: string }> = {
                  ADMIN: { gradient: "from-red-400 to-red-600", text: "text-red-500" },
                  MENTOR: { gradient: "from-amber-400 to-amber-600", text: "text-amber-500" },
                  TEAM_MANAGER: { gradient: "from-cyan-400 to-cyan-600", text: "text-cyan-500" },
                  DEPT_MANAGER: { gradient: "from-purple-400 to-purple-600", text: "text-purple-500" },
                  ROOM_MANAGER: { gradient: "from-purple-400 to-fuchsia-600", text: "text-purple-500" }
                };
                const colorConfig = colorMap[role.code] || { gradient: "from-clay-primary to-purple-600", text: "text-clay-primary" };

                return (
                  <div
                    key={role.code}
                    onClick={() => toggleRole(role.code as RoleCode)}
                    className={cn(
                      "group cursor-pointer relative flex items-center gap-4 p-5 rounded-3xl transition-all duration-300 ease-out",
                      active
                        ? "bg-white shadow-clay-card -translate-y-1"
                        : "bg-white/60 hover:bg-white hover:shadow-clay-card hover:-translate-y-0.5"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
                      active
                        ? `bg-gradient-to-br ${colorConfig.gradient} text-white shadow-clay-btn scale-110 rotate-3`
                        : "bg-white shadow-sm text-clay-muted group-hover:text-clay-foreground"
                    )}>
                      {config.icon}
                    </div>

                    <div className="flex-1">
                      <div className={cn(
                        "text-base font-black transition-colors",
                        active ? colorConfig.text : "text-clay-muted group-hover:text-clay-foreground"
                      )} style={{ fontFamily: "Nunito, sans-serif" }}>
                        {role.name}
                      </div>
                      {active && <div className="text-[10px] font-bold uppercase text-clay-muted tracking-widest animate-fadeIn">Enabled</div>}
                    </div>

                    {active && (
                      <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-clay-success shadow-sm animate-breathe" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer - Clay Style */}
        <DialogFooter className="px-10 py-8 border-t border-white/60 bg-gradient-to-r from-white/40 to-white/20 shrink-0 sm:justify-end gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-14 px-8 rounded-2xl font-bold text-clay-muted hover:bg-clay-muted/10 hover:text-clay-foreground transition-all"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white font-black text-lg shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-[0.92] active:shadow-clay-pressed"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            {isLoading ? "提交中..." : isEdit ? "保存更改" : "立即邀请"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
