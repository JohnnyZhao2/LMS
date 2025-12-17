/**
 * DepartmentTree Component
 * Displays organization structure with departments and their members
 * Requirements: 19.1 - Display room list and members
 * Requirements: 19.2 - Adjust user's department
 * Requirements: 19.3 - Designate room manager
 */

import * as React from 'react';
import { 
  Building2, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  UserCog, 
  ArrowRightLeft,
  Crown,
  User
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDepartments } from '../api/organization/get-departments';
import { useDepartmentMembersById } from '../api/organization/get-department-members';
import { useUpdateUserDepartment } from '../api/organization/update-user-department';
import { useSetDepartmentManager } from '../api/organization/set-department-manager';
import type { Department, DepartmentMember } from '../api/organization/types';

interface DepartmentTreeProps {
  className?: string;
}

interface DepartmentNodeProps {
  department: Department;
  isExpanded: boolean;
  onToggle: () => void;
  onTransferMember: (member: DepartmentMember) => void;
  onSetManager: (member: DepartmentMember) => void;
}

/**
 * Single department node with expandable member list
 */
function DepartmentNode({ 
  department, 
  isExpanded, 
  onToggle,
  onTransferMember,
  onSetManager
}: DepartmentNodeProps) {
  const { data: members, isLoading: membersLoading } = useDepartmentMembersById(
    isExpanded ? department.id : undefined
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Department Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "bg-card hover:bg-white/5 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          )}
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-text-primary">{department.name}</span>
          <Badge variant="secondary">
            {department.member_count} 人
          </Badge>
        </div>
        {department.manager && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>室经理: {department.manager.real_name}</span>
          </div>
        )}
      </button>

      {/* Members List */}
      {isExpanded && (
        <div className="border-t border-border bg-background/50">
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isManager={department.manager?.id === member.id}
                  onTransfer={() => onTransferMember(member)}
                  onSetManager={() => onSetManager(member)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-muted">
              暂无成员
            </div>
          )}
        </div>
      )}
    </div>
  );
}


interface MemberRowProps {
  member: DepartmentMember;
  isManager: boolean;
  onTransfer: () => void;
  onSetManager: () => void;
}

/**
 * Single member row within a department
 */
function MemberRow({ member, isManager, onTransfer, onSetManager }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isManager ? "bg-yellow-500/20" : "bg-primary/20"
        )}>
          {isManager ? (
            <Crown className="h-4 w-4 text-yellow-500" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{member.real_name}</span>
            {isManager && (
              <Badge variant="warning">室经理</Badge>
            )}
            {!member.is_active && (
              <Badge variant="destructive">已停用</Badge>
            )}
          </div>
          <div className="text-sm text-text-muted">
            {member.employee_id} · {member.username}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTransfer}
          title="调整所属室"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        {!isManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetManager}
            title="指定为室经理"
          >
            <UserCog className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Transfer Member Modal
 * Requirements: 19.2 - Adjust user's department
 */
interface TransferMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: DepartmentMember | null;
  departments: Department[];
  currentDepartmentId?: number;
}

function TransferMemberModal({ 
  open, 
  onClose, 
  member, 
  departments,
  currentDepartmentId 
}: TransferMemberModalProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>('');
  const updateDepartment = useUpdateUserDepartment();

  React.useEffect(() => {
    if (open && currentDepartmentId) {
      setSelectedDepartmentId(String(currentDepartmentId));
    }
  }, [open, currentDepartmentId]);

  const handleConfirm = async () => {
    if (!member || !selectedDepartmentId) return;
    
    try {
      await updateDepartment.mutateAsync({
        userId: member.id,
        data: { department_id: Number(selectedDepartmentId) }
      });
      onClose();
    } catch (error) {
      console.error('Failed to transfer member:', error);
    }
  };

  const departmentOptions = departments.map(dept => ({
    value: String(dept.id),
    label: dept.name
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="调整所属室"
      description={member ? `将 ${member.real_name} 调整到其他室` : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm}
            loading={updateDepartment.isPending}
            disabled={!selectedDepartmentId || selectedDepartmentId === String(currentDepartmentId)}
          >
            确认调整
          </Button>
        </>
      }
    >
      <div className="py-4">
        <Select
          label="选择目标室"
          value={selectedDepartmentId}
          onChange={(value) => setSelectedDepartmentId(value as string)}
          options={departmentOptions}
          placeholder="请选择室"
        />
      </div>
    </Modal>
  );
}

/**
 * Main DepartmentTree Component
 * Requirements: 19.1, 19.2, 19.3
 */
export function DepartmentTree({ className }: DepartmentTreeProps) {
  const { data: departments, isLoading, error } = useDepartments();
  const setManager = useSetDepartmentManager();
  
  const [expandedDepts, setExpandedDepts] = React.useState<Set<number>>(new Set());
  const [transferModalOpen, setTransferModalOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<DepartmentMember | null>(null);
  const [selectedDeptId, setSelectedDeptId] = React.useState<number | undefined>();
  const [managerConfirmOpen, setManagerConfirmOpen] = React.useState(false);
  const [pendingManager, setPendingManager] = React.useState<{
    member: DepartmentMember;
    departmentId: number;
  } | null>(null);

  const toggleDepartment = (deptId: number) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const handleTransferMember = (member: DepartmentMember, departmentId: number) => {
    setSelectedMember(member);
    setSelectedDeptId(departmentId);
    setTransferModalOpen(true);
  };

  const handleSetManager = (member: DepartmentMember, departmentId: number) => {
    setPendingManager({ member, departmentId });
    setManagerConfirmOpen(true);
  };

  const confirmSetManager = async () => {
    if (!pendingManager) return;
    
    try {
      await setManager.mutateAsync({
        departmentId: pendingManager.departmentId,
        data: { user_id: pendingManager.member.id }
      });
      setManagerConfirmOpen(false);
      setPendingManager(null);
    } catch (error) {
      console.error('Failed to set manager:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-danger">
        加载组织架构失败，请刷新重试
      </div>
    );
  }

  if (!departments || departments.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="暂无组织架构数据"
        description="请先创建部门/室"
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          组织架构
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {departments.map((dept) => (
            <DepartmentNode
              key={dept.id}
              department={dept}
              isExpanded={expandedDepts.has(dept.id)}
              onToggle={() => toggleDepartment(dept.id)}
              onTransferMember={(member) => handleTransferMember(member, dept.id)}
              onSetManager={(member) => handleSetManager(member, dept.id)}
            />
          ))}
        </div>
      </CardContent>

      {/* Transfer Member Modal */}
      <TransferMemberModal
        open={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedMember(null);
          setSelectedDeptId(undefined);
        }}
        member={selectedMember}
        departments={departments}
        currentDepartmentId={selectedDeptId}
      />

      {/* Set Manager Confirmation Dialog */}
      <ConfirmDialog
        open={managerConfirmOpen}
        onClose={() => {
          setManagerConfirmOpen(false);
          setPendingManager(null);
        }}
        onConfirm={confirmSetManager}
        title="指定室经理"
        description={pendingManager 
          ? `确定将 ${pendingManager.member.real_name} 指定为室经理吗？原室经理将被替换。`
          : ''
        }
        confirmText="确认指定"
        loading={setManager.isPending}
      />
    </Card>
  );
}

export default DepartmentTree;
