import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreateRole } from '@/features/authorization/api/authorization';
import type { DataScope, Department } from '@/types/common';
import { showApiError } from '@/utils/error-handler';
import { RoleScopeFields } from './role-config-header';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onCreated: (roleCode: string) => void;
}

export const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  onOpenChange,
  departments,
  onCreated,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>新建自定义角色</DialogTitle>
        <DialogDescription>创建专项管理角色，可在右侧继续勾选功能权限。</DialogDescription>
      </DialogHeader>
      {open ? (
        <CreateRoleForm departments={departments} onClose={() => onOpenChange(false)} onCreated={onCreated} />
      ) : null}
    </DialogContent>
  </Dialog>
);

const CreateRoleForm: React.FC<{
  departments: Department[];
  onClose: () => void;
  onCreated: (roleCode: string) => void;
}> = ({ departments, onClose, onCreated }) => {
  const createRole = useCreateRole();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<DataScope>('SELF');
  const [deptIds, setDeptIds] = useState<number[]>(() => (departments[0] ? [departments[0].id] : []));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入角色名称');
      return;
    }
    if (scope === 'CUSTOM_DEPT' && deptIds.length === 0) {
      toast.warning('请至少选择一个部门');
      return;
    }
    try {
      const created = await createRole.mutateAsync({
        name: trimmed,
        data_scope: scope,
        department_ids: scope === 'CUSTOM_DEPT' ? deptIds : [],
      });
      onClose();
      onCreated(created.code);
      toast.success('角色已创建');
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">角色名称</label>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：知识管理专员" className="h-10 text-sm" autoFocus />
      </div>

      <RoleScopeFields
        variant="stacked"
        scope={scope}
        departmentIds={deptIds}
        departments={departments}
        onScopeChange={(next) => {
          setScope(next);
          if (next === 'CUSTOM_DEPT' && deptIds.length === 0 && departments[0]) {
            setDeptIds([departments[0].id]);
          }
        }}
        onDepartmentIdsChange={setDeptIds}
      />

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onClose}>取消</Button>
        <Button type="submit" disabled={createRole.isPending}>
          {createRole.isPending ? '创建中...' : '创建角色'}
        </Button>
      </DialogFooter>
    </form>
  );
};
