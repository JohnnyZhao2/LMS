import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CircleButton } from '@/components/ui/circle-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCurrentRole } from '@/hooks/use-current-role';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { isAdminLikeRole } from '@/lib/role-utils';
import type { SpotCheck, SpotCheckStudent } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { useDeleteSpotCheck } from '../api/create-spot-check';
import { useSpotChecks, useSpotCheckStudents } from '../api/get-spot-checks';
import { SpotCheckRecordList } from './spot-check-record-list';
import { SpotCheckStudentPanel, type SpotCheckDepartmentFilter } from './spot-check-student-panel';

const matchDepartmentFilter = (student: SpotCheckStudent, filter: SpotCheckDepartmentFilter) => {
  if (filter === 'all') {
    return true;
  }
  const departmentName = student.department_name?.trim() ?? '';
  if (filter === 'room1') {
    return departmentName.includes('一室') || departmentName.includes('1室');
  }
  return departmentName.includes('二室') || departmentName.includes('2室');
};

export const SpotCheckList: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<SpotCheckDepartmentFilter>('all');
  const [paginationByStudent, setPaginationByStudent] = useState<Record<number, { page: number; pageSize: number }>>(
    {},
  );
  const [deleteTarget, setDeleteTarget] = useState<SpotCheck | null>(null);

  const currentRole = useCurrentRole();
  const deferredStudentSearch = useDeferredValue(studentSearch.trim());
  const { user, hasPermission } = useAuth();
  const { roleNavigate } = useRoleNavigate();
  const deleteSpotCheck = useDeleteSpotCheck();

  const { data: students = [], isLoading: studentsLoading } = useSpotCheckStudents({
    role: currentRole,
    search: deferredStudentSearch || undefined,
  });
  const filteredStudents = useMemo(
    () => students.filter((student) => matchDepartmentFilter(student, departmentFilter)),
    [departmentFilter, students],
  );
  const resolvedSelectedStudentId = useMemo(() => {
    if (filteredStudents.length === 0) {
      return null;
    }
    if (selectedStudentId !== null && filteredStudents.some((student) => student.id === selectedStudentId)) {
      return selectedStudentId;
    }
    return filteredStudents[0].id;
  }, [filteredStudents, selectedStudentId]);

  const { page, pageSize } = resolvedSelectedStudentId
    ? (paginationByStudent[resolvedSelectedStudentId] ?? { page: 1, pageSize: 20 })
    : { page: 1, pageSize: 20 };

  const { data: recordsData, isLoading: recordsLoading } = useSpotChecks({
    page,
    pageSize,
    role: currentRole,
    studentId: resolvedSelectedStudentId ?? undefined,
    enabled: resolvedSelectedStudentId !== null,
  });

  const selectedStudent = useMemo(
    () => filteredStudents.find((student) => student.id === resolvedSelectedStudentId) ?? null,
    [filteredStudents, resolvedSelectedStudentId],
  );
  const records = useMemo(() => recordsData?.results ?? [], [recordsData?.results]);

  const canCreateSpotCheck = hasPermission('spot_check.create');
  const canUpdateSpotCheck = hasPermission('spot_check.update');
  const canDeleteSpotCheck = hasPermission('spot_check.delete');
  const canManageRecord = (record: SpotCheck) => isAdminLikeRole(currentRole) || record.checker === user?.id;

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteSpotCheck.mutateAsync(deleteTarget.id);
      toast.success('抽查记录已删除');
      setDeleteTarget(null);
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  const handleSelectStudent = (studentId: number) => {
    if (studentId === resolvedSelectedStudentId) {
      return;
    }
    startTransition(() => {
      setSelectedStudentId(studentId);
    });
  };

  const updatePagination = (next: { page?: number; pageSize?: number }) => {
    if (!resolvedSelectedStudentId) {
      return;
    }
    setPaginationByStudent((prev) => ({
      ...prev,
      [resolvedSelectedStudentId]: {
        page: next.page ?? page,
        pageSize: next.pageSize ?? pageSize,
      },
    }));
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col animate-fadeIn">
        <PageHeader
          title="抽查管理"
          icon={<ListChecks className="h-5 w-5" />}
          extra={
            canCreateSpotCheck ? (
              <CircleButton onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/create`)} label="发起抽查" />
            ) : null
          }
        />

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <SpotCheckStudentPanel
            students={filteredStudents}
            selectedStudentId={resolvedSelectedStudentId}
            searchValue={studentSearch}
            onSearchChange={setStudentSearch}
            onSelectStudent={handleSelectStudent}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={(value) => {
              startTransition(() => {
                setDepartmentFilter(value);
              });
            }}
            isLoading={studentsLoading}
          />

          <SpotCheckRecordList
            selectedStudent={selectedStudent}
            records={records}
            totalCount={recordsData?.count ?? 0}
            page={page}
            pageSize={pageSize}
            isLoading={recordsLoading}
            canUpdateSpotCheck={canUpdateSpotCheck}
            canDeleteSpotCheck={canDeleteSpotCheck}
            canManageRecord={canManageRecord}
            onEditRecord={(record) => roleNavigate(`${ROUTES.SPOT_CHECKS}/${record.id}/edit`)}
            onDeleteRecord={setDeleteTarget}
            onPageChange={(nextPage) => updatePagination({ page: nextPage })}
            onPageSizeChange={(nextPageSize) => {
              updatePagination({ page: 1, pageSize: nextPageSize });
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="删除这条抽查记录？"
        description={`将永久删除学员「${deleteTarget?.student_name ?? ''}」的抽查记录，此操作不可撤销。`}
        icon={<Trash2 className="h-10 w-10" />}
        iconBgColor="bg-destructive-100"
        iconColor="text-destructive"
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteSpotCheck.isPending}
      />
    </>
  );
};

export default SpotCheckList;
