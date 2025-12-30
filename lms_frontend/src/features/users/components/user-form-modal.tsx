import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Building2,
  Users,
  X,
  CheckCircle2,
  IdCard,
  Lock,
} from 'lucide-react';

import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

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


/**
 * 用户表单弹窗组件（用于创建和编辑）
 * 使用 ShadCN UI + 受控状态
 */
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

  // 编辑模式下填充表单
  useEffect(() => {
    if (open) {
      if (isEdit && userDetail) {
        const currentRoleCodes = userDetail.roles
          .filter((r) => r.code !== 'STUDENT')
          .map((r) => r.code as RoleCode);
        setFormData({
          username: userDetail.username,
          employee_id: userDetail.employee_id,
          password: '',
          department_id: userDetail.department?.id,
          role_codes: currentRoleCodes,
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
    if (!formData.username.trim()) newErrors.username = '请填写姓名';
    if (!formData.employee_id.trim()) newErrors.employee_id = '请填写工号';
    if (!isEdit && !formData.password.trim()) newErrors.password = '请设置初始密码';
    if (!formData.department_id) newErrors.department_id = '请选择部门';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: userId!,
          data: {
            username: formData.username,
            employee_id: formData.employee_id,
            department_id: formData.department_id,
          },
        });
        await assignRoles.mutateAsync({ id: userId!, roles: formData.role_codes });
        const currentMentorId = userDetail?.mentor?.id ?? null;
        if (currentMentorId !== formData.mentor_id) {
          await assignMentor.mutateAsync({ id: userId!, mentorId: formData.mentor_id });
        }
        toast.success('用户信息更新成功');
      } else {
        await createUser.mutateAsync({
          password: formData.password,
          employee_id: formData.employee_id,
          username: formData.username,
          department_id: formData.department_id!,
          mentor_id: formData.mentor_id,
        });
        toast.success('用户创建成功');
      }
      onClose();
      onSuccess?.();
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  const getAvatarText = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  const roleDescriptions: Record<string, string> = {
    ADMIN: '全平台治理与系统维护',
    DEPT_MANAGER: '本室资源调配与人员治理',
    MENTOR: '指导学员完成学习任务',
    TEAM_MANAGER: '团队日常治理与考核',
    STUDENT: '参与学习与技能提升',
  };

  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <Shield className="w-5 h-5" />,
    DEPT_MANAGER: <Building2 className="w-5 h-5" />,
    MENTOR: <Users className="w-5 h-5" />,
    TEAM_MANAGER: <Users className="w-5 h-5" />,
    STUDENT: <User className="w-5 h-5" />,
  };

  const getRoleColor = (code: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'rgb(239, 68, 68)',
      DEPT_MANAGER: 'rgb(168, 85, 247)',
      MENTOR: 'rgb(245, 158, 11)',
      TEAM_MANAGER: 'rgb(6, 182, 212)',
      STUDENT: 'rgb(77, 108, 255)',
    };
    return colors[code] || 'rgb(77, 108, 255)';
  };

  const toggleRole = (roleCode: RoleCode) => {
    setFormData(prev => ({
      ...prev,
      role_codes: prev.role_codes.includes(roleCode)
        ? prev.role_codes.filter(c => c !== roleCode)
        : [...prev.role_codes, roleCode],
    }));
  };

  const isLoading = createUser.isPending || updateUser.isPending || assignRoles.isPending || assignMentor.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-180 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>

            {/* Header */}
            <div className="px-10 pt-10 pb-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)', borderBottom: '1px solid rgb(243, 244, 246)' }}>
              <div className="absolute -top-5 -right-5 w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(77, 108, 255, 0.1) 0%, transparent 70%)' }} />
              <div className="flex items-center relative z-1">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                    <AvatarFallback className="text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, rgb(99, 130, 255), rgb(77, 108, 255))' }}>
                      {getAvatarText(formData.username || userDetail?.username)}
                    </AvatarFallback>
                  </Avatar>
                  {isEdit && (
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-[3px] border-white flex items-center justify-center" style={{ background: 'rgb(34, 197, 94)' }}>
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold tracking-tight m-0">{isEdit ? '编辑详细资料' : '创建新成员'}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      {isEdit ? (<><IdCard className="inline w-3.5 h-3.5 mr-1" />{userDetail?.employee_id || 'ID LOADING...'}</>) : '请完善下方基础信息以邀请新成员'}
                    </span>
                    {isEdit && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(77, 108, 255, 0.1)', color: 'rgb(77, 108, 255)' }}>已激活</span>}
                  </div>
                </div>
              </div>
            </div>


            <form onSubmit={handleSubmit} className="px-10 pt-8 pb-10">
              {/* Basic Info */}
              <div className="mb-8">
                <div className="flex items-center mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'rgba(77, 108, 255, 0.1)', color: 'rgb(77, 108, 255)' }}>
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-semibold m-0">核心身份信息</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">真实姓名</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="username" placeholder="例如: 张三" className="pl-9 h-11 rounded-lg" value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))} />
                    </div>
                    {errors.username && <p className="text-sm font-medium text-red-500">{errors.username}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">工号</Label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="employee_id" placeholder="例如: EMP888" className="pl-9 h-11 rounded-lg" value={formData.employee_id} onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} />
                    </div>
                    {errors.employee_id && <p className="text-sm font-medium text-red-500">{errors.employee_id}</p>}
                  </div>
                </div>
                {!isEdit && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="password">初始密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="password" type="password" placeholder="设置一个安全的初始密码" className="pl-9 h-11 rounded-lg" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} />
                    </div>
                    {errors.password && <p className="text-sm font-medium text-red-500">{errors.password}</p>}
                  </div>
                )}
              </div>

              {/* Role Configuration */}
              <div className="mb-8">
                <div className="flex items-center mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' }}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-semibold m-0">角色与权限分配</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((role) => {
                    const isSelected = formData.role_codes.includes(role.code as RoleCode);
                    const roleColor = getRoleColor(role.code);
                    return (
                      <Card key={role.code} onClick={() => toggleRole(role.code as RoleCode)} className="cursor-pointer p-4 transition-all duration-300" style={{ borderWidth: '2px', borderColor: isSelected ? roleColor : 'rgb(243, 244, 246)', backgroundColor: isSelected ? `${roleColor}08` : '#fff', boxShadow: isSelected ? `0 8px 16px ${roleColor}15` : 'none' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl transition-all duration-300" style={{ background: isSelected ? roleColor : 'rgb(249, 250, 251)', color: isSelected ? '#fff' : 'rgb(107, 114, 128)' }}>
                            {roleIcons[role.code] || <User className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm" style={{ color: isSelected ? 'rgb(17, 24, 39)' : 'rgb(55, 65, 81)' }}>{role.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{roleDescriptions[role.code] || '基础操作权限'}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4.5 h-4.5" style={{ color: roleColor }} />}
                        </div>
                      </Card>
                    );
                  })}
                  <Card className="p-4 cursor-default opacity-80" style={{ borderWidth: '2px', borderColor: 'rgb(77, 108, 255)', backgroundColor: 'rgba(77, 108, 255, 0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl text-white" style={{ background: 'rgb(77, 108, 255)' }}><User className="w-5 h-5" /></div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">学员</div>
                        <div className="text-xs text-gray-500 mt-0.5">核心学习权限 (内置)</div>
                      </div>
                      <CheckCircle2 className="w-4.5 h-4.5" style={{ color: 'rgb(77, 108, 255)' }} />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Organization & Mentorship */}
              <div className="mb-10">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'rgb(168, 85, 247)' }}><Building2 className="w-4 h-4" /></div>
                      <h3 className="text-[15px] font-semibold m-0">所属组织架构</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => {
                        const isSelected = formData.department_id === dept.id;
                        return (
                          <button key={dept.id} type="button" onClick={() => setFormData(prev => ({ ...prev, department_id: dept.id }))} className="px-4 py-2 rounded-full text-sm transition-all duration-200 border active:scale-95" style={{ background: isSelected ? 'rgb(77, 108, 255)' : 'rgb(249, 250, 251)', color: isSelected ? '#fff' : 'rgb(75, 85, 99)', fontWeight: isSelected ? 600 : 400, borderColor: isSelected ? 'rgb(77, 108, 255)' : 'rgb(243, 244, 246)', boxShadow: isSelected ? '0 4px 10px rgba(77, 108, 255, 0.2)' : 'none' }}>
                            {dept.name}
                          </button>
                        );
                      })}
                    </div>
                    {errors.department_id && <p className="text-sm font-medium text-red-500 mt-2">{errors.department_id}</p>}
                  </div>
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'rgb(6, 182, 212)' }}><Users className="w-4 h-4" /></div>
                      <h3 className="text-[15px] font-semibold m-0">师徒关系绑定</h3>
                    </div>
                    <Select value={formData.mentor_id?.toString() || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, mentor_id: value ? Number(value) : null }))}>
                      <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="点击搜索并指定导师" /></SelectTrigger>
                      <SelectContent>
                        {mentors.filter((m) => !isEdit || m.id !== userId).map((mentor) => (
                          <SelectItem key={mentor.id} value={mentor.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6"><AvatarFallback className="text-xs font-semibold text-white" style={{ background: 'rgb(6, 182, 212)' }}>{getAvatarText(mentor.username)}</AvatarFallback></Avatar>
                              <span>{mentor.username}</span>
                              <span className="text-xs text-gray-400">({mentor.employee_id})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-4 pt-8" style={{ borderTop: '1px solid rgb(243, 244, 246)' }}>
                <Button type="button" variant="ghost" onClick={onClose} className="px-8 h-12 rounded-lg font-medium text-gray-500 bg-gray-50 hover:bg-gray-100">取消</Button>
                <Button type="submit" disabled={isLoading} className="px-12 h-12 rounded-lg font-semibold" style={{ background: 'rgb(77, 108, 255)', boxShadow: '0 0 20px rgba(77, 108, 255, 0.3)' }}>
                  {isLoading ? '处理中...' : isEdit ? '保存更改' : '立即创建'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
};
