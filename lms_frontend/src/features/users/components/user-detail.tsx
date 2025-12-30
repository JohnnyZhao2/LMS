import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  UserX,
  UserCheck,
  KeyRound,
  Shield,
  Users,
  User,
  Building2,
  CheckCircle2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { useUserDetail, useMentors, useRoles } from '../api/get-users';
import {
  useActivateUser,
  useDeactivateUser,
  useResetPassword,
  useAssignRoles,
  useAssignMentor,
} from '../api/manage-users';
import { UserFormModal } from './user-form-modal';
import type { RoleCode } from '@/types/api';
import dayjs from '@/lib/dayjs';

/**
 * 用户详情组件（ShadCN UI 版本）
 * 保持与原 Ant Design 版本相同的视觉设计和布局
 */
export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, refetch } = useUserDetail(Number(id || 0));
  const { data: mentors = [] } = useMentors();
  const { data: roles = [] } = useRoles();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetPassword();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [mentorModalVisible, setMentorModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | 'reset' | 'unbind' | null>(null);
  const [passwordResultModal, setPasswordResultModal] = useState<{ visible: boolean; password: string }>({
    visible: false,
    password: '',
  });

  // 角色和导师表单状态
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');

  // 过滤掉当前用户（不能指定自己为导师）
  const availableMentors = mentors.filter((m) => m.id !== Number(id));

  // 获取当前用户已有的角色代码（排除学员角色）
  const currentRoleCodes = user?.roles.filter((r) => r.code !== 'STUDENT').map((r) => r.code as RoleCode) || [];

  // 判断是否是超级用户
  const isSuperuser = user?.is_superuser || false;

  const handleToggleActive = () => {
    if (!user) return;
    setConfirmAction(user.is_active ? 'deactivate' : 'activate');
    setConfirmModalVisible(true);
  };

  const handleResetPassword = () => {
    setConfirmAction('reset');
    setConfirmModalVisible(true);
  };

  const handleUnbindMentor = () => {
    setConfirmAction('unbind');
    setConfirmModalVisible(true);
  };

  const executeConfirmAction = async () => {
    if (!user) return;

    try {
      switch (confirmAction) {
        case 'activate':
          await activateUser.mutateAsync(user.id);
          toast.success('已启用');
          break;
        case 'deactivate':
          await deactivateUser.mutateAsync(user.id);
          toast.success('已停用');
          break;
        case 'reset': {
          const result = await resetPassword.mutateAsync(user.id);
          setPasswordResultModal({ visible: true, password: result.temporary_password });
          break;
        }
        case 'unbind':
          await assignMentor.mutateAsync({ id: user.id, mentorId: null });
          toast.success('已解除导师绑定');
          break;
      }
      refetch();
    } catch {
      toast.error('操作失败');
    }
    setConfirmModalVisible(false);
    setConfirmAction(null);
  };

  const handleOpenRoleModal = () => {
    setSelectedRoles(currentRoleCodes);
    setRoleModalVisible(true);
  };

  const handleOpenMentorModal = () => {
    setSelectedMentorId(user?.mentor?.id?.toString() || '');
    setMentorModalVisible(true);
  };

  const handleAssignRoles = async () => {
    if (!user) return;
    try {
      await assignRoles.mutateAsync({ id: user.id, roles: selectedRoles });
      toast.success('角色分配成功');
      setRoleModalVisible(false);
      refetch();
    } catch {
      toast.error('角色分配失败');
    }
  };

  const handleAssignMentor = async () => {
    if (!user) return;
    try {
      const mentorId = selectedMentorId ? Number(selectedMentorId) : null;
      await assignMentor.mutateAsync({ id: user.id, mentorId });
      toast.success(mentorId ? '导师指定成功' : '已解除导师绑定');
      setMentorModalVisible(false);
      refetch();
    } catch {
      toast.error('操作失败');
    }
  };

  const toggleRole = (roleCode: RoleCode) => {
    setSelectedRoles((prev) =>
      prev.includes(roleCode) ? prev.filter((c) => c !== roleCode) : [...prev, roleCode]
    );
  };

  const getAvatarText = (name?: string) => (name ? name.charAt(0).toUpperCase() : '?');

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

  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <Shield className="w-4 h-4" />,
    DEPT_MANAGER: <Building2 className="w-4 h-4" />,
    MENTOR: <Users className="w-4 h-4" />,
    TEAM_MANAGER: <Users className="w-4 h-4" />,
    STUDENT: <User className="w-4 h-4" />,
  };

  const roleDescriptions: Record<string, string> = {
    ADMIN: '全平台治理与系统维护',
    DEPT_MANAGER: '本室资源调配与人员治理',
    MENTOR: '指导学员完成学习任务',
    TEAM_MANAGER: '团队日常治理与考核',
    STUDENT: '参与学习与技能提升',
  };

  const getConfirmModalContent = () => {
    switch (confirmAction) {
      case 'activate':
        return { title: '确认启用', content: '确定要启用该用户吗？' };
      case 'deactivate':
        return { title: '确认停用', content: '确定要停用该用户吗？' };
      case 'reset':
        return { title: '确认重置密码', content: '确定要重置该用户的密码吗？重置后会生成临时密码。' };
      case 'unbind':
        return { title: '确认解除绑定', content: '确定要解除该用户的导师绑定吗？' };
      default:
        return { title: '', content: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">用户不存在</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-semibold m-0">用户详情</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFormModalOpen(true)}>
            <Edit className="w-4 h-4 mr-1" />
            编辑信息
          </Button>
          {!isSuperuser && (
            <Button variant="outline" size="sm" onClick={handleToggleActive}>
              {user.is_active ? (
                <>
                  <UserX className="w-4 h-4 mr-1" />
                  停用
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-1" />
                  启用
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleResetPassword}>
            <KeyRound className="w-4 h-4 mr-1" />
            重置密码
          </Button>
        </div>
      </div>

      {/* 主卡片 */}
      <Card>
        <CardContent className="p-6">
          {/* 基本信息 */}
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-500" />
              基本信息
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-32 border-r">工号</td>
                    <td className="px-4 py-3 w-1/3">{user.employee_id}</td>
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-32 border-r border-l">姓名</td>
                    <td className="px-4 py-3">{user.username}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r">部门</td>
                    <td className="px-4 py-3">{user.department?.name || '-'}</td>
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r border-l">状态</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? 'success' : 'error'}>
                        {user.is_active ? '启用' : '停用'}
                      </Badge>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r">导师</td>
                    <td className="px-4 py-3">
                      {user.mentor ? `${user.mentor.username} (${user.mentor.employee_id})` : '-'}
                    </td>
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r border-l">创建时间</td>
                    <td className="px-4 py-3">
                      {user.created_at ? dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r">更新时间</td>
                    <td className="px-4 py-3" colSpan={3}>
                      {user.updated_at ? dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-6" />

          {/* 角色管理 */}
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              角色管理
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {user.roles.map((role) => (
                <Badge
                  key={role.code}
                  className="px-3 py-1"
                  style={{
                    backgroundColor: `${getRoleColor(role.code)}15`,
                    color: getRoleColor(role.code),
                    border: `1px solid ${getRoleColor(role.code)}30`,
                  }}
                >
                  {role.name}
                </Badge>
              ))}
              <Button variant="link" size="sm" className="text-primary-500 p-0 h-auto" onClick={handleOpenRoleModal}>
                分配角色
              </Button>
            </div>
          </div>

          {/* 导师管理 */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" />
              导师管理
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="link" size="sm" className="text-primary-500 p-0 h-auto" onClick={handleOpenMentorModal}>
                {user.mentor ? '更换导师' : '指定导师'}
              </Button>
              {user.mentor && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-red-500 p-0 h-auto hover:text-red-600"
                  onClick={handleUnbindMentor}
                >
                  解除绑定
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 确认操作弹窗 */}
      <Dialog open={confirmModalVisible} onOpenChange={setConfirmModalVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getConfirmModalContent().title}</DialogTitle>
            <DialogDescription>{getConfirmModalContent().content}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmModalVisible(false)}>
              取消
            </Button>
            <Button onClick={executeConfirmAction}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 密码重置结果弹窗 */}
      <Dialog open={passwordResultModal.visible} onOpenChange={(open) => setPasswordResultModal({ visible: open, password: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>密码重置成功</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-2">临时密码：</p>
            <p className="font-mono text-lg font-semibold bg-gray-100 p-3 rounded-lg">{passwordResultModal.password}</p>
            <p className="text-sm text-gray-500 mt-3">请通知用户使用临时密码登录并修改密码。</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordResultModal({ visible: false, password: '' })}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分配角色弹窗 */}
      <Dialog open={roleModalVisible} onOpenChange={setRoleModalVisible}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>分配角色</DialogTitle>
            <DialogDescription>选择要分配给该用户的角色（学员角色自动保留）</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => {
                const isSelected = selectedRoles.includes(role.code as RoleCode);
                const roleColor = getRoleColor(role.code);
                return (
                  <Card
                    key={role.code}
                    onClick={() => toggleRole(role.code as RoleCode)}
                    className="cursor-pointer p-3 transition-all duration-200"
                    style={{
                      borderWidth: '2px',
                      borderColor: isSelected ? roleColor : 'rgb(243, 244, 246)',
                      backgroundColor: isSelected ? `${roleColor}08` : '#fff',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                        style={{
                          background: isSelected ? roleColor : 'rgb(249, 250, 251)',
                          color: isSelected ? '#fff' : 'rgb(107, 114, 128)',
                        }}
                      >
                        {roleIcons[role.code] || <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{role.name}</div>
                        <div className="text-xs text-gray-400 truncate">{roleDescriptions[role.code]}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: roleColor }} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRoleModalVisible(false)}>
              取消
            </Button>
            <Button onClick={handleAssignRoles} disabled={assignRoles.isPending}>
              {assignRoles.isPending ? '处理中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 指定导师弹窗 */}
      <Dialog open={mentorModalVisible} onOpenChange={setMentorModalVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>指定导师</DialogTitle>
            <DialogDescription>选择要指定的导师（留空解除绑定）</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="mentor" className="mb-2 block">
              导师
            </Label>
            <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择导师（留空解除绑定）" />
              </SelectTrigger>
              <SelectContent>
                {availableMentors.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{ background: 'rgb(6, 182, 212)' }}
                        >
                          {getAvatarText(mentor.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{mentor.username}</span>
                      <span className="text-xs text-gray-400">({mentor.employee_id})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMentorModalVisible(false)}>
              取消
            </Button>
            <Button onClick={handleAssignMentor} disabled={assignMentor.isPending}>
              {assignMentor.isPending ? '处理中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户信息弹窗 */}
      <UserFormModal
        open={formModalOpen}
        userId={user?.id}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
