import { startTransition, useDeferredValue, useState } from 'react';
import { ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageSplit, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { SpotCheck } from '@/types/spot-check';
import { showApiError } from '@/utils/error-handler';
import { useDeleteSpotCheck } from '../api/create-spot-check';
import { useSpotChecks, useSpotCheckStudents } from '../api/get-spot-checks';
import { SpotCheckForm } from './spot-check-form';
import { SpotCheckRecordList, type SpotCheckStatusFilter } from './spot-check-record-list';
import { SpotCheckStudentPanel, type SpotCheckDepartmentFilter } from './spot-check-student-panel';

export const SpotCheckList: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [checkedStudentIds, setCheckedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState<SpotCheckDepartmentFilter>('all');
  const [statusFilter, setStatusFilter] = useState<SpotCheckStatusFilter>('SUBMITTED');
  const [paginationByStudent, setPaginationByStudent] = useState<Record<number, { page: number; pageSize: number }>>(
    {},
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SpotCheck | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpotCheck | null>(null);

  const currentRole = useCurrentRole();
  const deferredStudentSearch = useDeferredValue(studentSearch.trim());
  const { hasCapability } = useAuth();
  const deleteSpotCheck = useDeleteSpotCheck();
  const studentPageSize = 50;

  const { data: studentsData, isLoading: studentsLoading } = useSpotCheckStudents({
    role: currentRole,
    search: deferredStudentSearch || undefined,
    department: departmentFilter,
    page: studentPage,
    pageSize: studentPageSize,
  });
  const students = studentsData?.results ?? [];
  const studentIdSet = new Set(students.map((student) => student.id));
  const resolvedSelectedStudentId =
    students.length === 0
      ? null
      : selectedStudentId !== null && students.some((student) => student.id === selectedStudentId)
        ? selectedStudentId
        : students[0].id;
  /** 勾选只保留当前页可见的学员 */
  const visibleCheckedStudentIds = checkedStudentIds.filter((id) => studentIdSet.has(id));

  const { page, pageSize } = resolvedSelectedStudentId
    ? (paginationByStudent[resolvedSelectedStudentId] ?? { page: 1, pageSize: 20 })
    : { page: 1, pageSize: 20 };

  const { data: recordsData, isLoading: recordsLoading } = useSpotChecks({
    page,
    pageSize,
    role: currentRole,
    studentId: resolvedSelectedStudentId ?? undefined,
    status: statusFilter,
    enabled: resolvedSelectedStudentId !== null,
  });

  const selectedStudent = students.find((student) => student.id === resolvedSelectedStudentId) ?? null;
  const records = recordsData?.results ?? [];

  const canCreateSpotCheck = hasCapability('spot_check.create');

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

  const handleToggleCheckStudent = (studentId: number) => {
    setCheckedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleToggleCheckAll = (selectAll: boolean) => {
    if (!selectAll) {
      setCheckedStudentIds([]);
      return;
    }
    setCheckedStudentIds(students.map((student) => student.id));
  };

  /** 发起对象：仅勾选的学员 */
  const createTargetStudentIds = visibleCheckedStudentIds;

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

  const handleStatusFilterChange = (value: SpotCheckStatusFilter) => {
    startTransition(() => {
      setStatusFilter(value);
      if (resolvedSelectedStudentId) {
        setPaginationByStudent((prev) => ({
          ...prev,
          [resolvedSelectedStudentId]: {
            page: 1,
            pageSize,
          },
        }));
      }
    });
  };

  return (
    <>
      <PageFillShell>
        <PageHeader
          title="抽查管理"
          icon={<ListChecks className="h-5 w-5" />}
        />

        <PageWorkbench>
          <PageSplit className="min-h-0 flex-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <SpotCheckStudentPanel
              students={students}
              selectedStudentId={resolvedSelectedStudentId}
              checkedStudentIds={visibleCheckedStudentIds}
              searchValue={studentSearch}
              onSearchChange={(value) => {
                setStudentSearch(value);
                setStudentPage(1);
              }}
              onSelectStudent={handleSelectStudent}
              onToggleCheckStudent={handleToggleCheckStudent}
              onToggleCheckAll={handleToggleCheckAll}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={(value) => {
                startTransition(() => {
                  setDepartmentFilter(value);
                  setStudentPage(1);
                });
              }}
              isLoading={studentsLoading}
              totalCount={studentsData?.count ?? 0}
              page={studentPage}
              pageSize={studentPageSize}
              onPageChange={setStudentPage}
            />

            <SpotCheckRecordList
              selectedStudent={selectedStudent}
              records={records}
              totalCount={recordsData?.count ?? 0}
              page={page}
              pageSize={pageSize}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              isLoading={recordsLoading}
              onEditRecord={setEditingRecord}
              onDeleteRecord={setDeleteTarget}
              onPageChange={(nextPage) => updatePagination({ page: nextPage })}
              onPageSizeChange={(nextPageSize) => {
                updatePagination({ page: 1, pageSize: nextPageSize });
              }}
              canCreateSpotCheck={canCreateSpotCheck}
              checkedCount={visibleCheckedStudentIds.length}
              onCreateSpotCheck={() => setIsCreateDialogOpen(true)}
            />
          </PageSplit>
        </PageWorkbench>
      </PageFillShell>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-[1060px] flex-col gap-0 overflow-hidden border-transparent bg-[#fcfcfe] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="shrink-0 px-5 py-5">
            <DialogTitle className="text-lg font-semibold text-foreground">发起抽查</DialogTitle>
          </DialogHeader>
          {isCreateDialogOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pl-5 pr-0 pb-5">
              <SpotCheckForm
                studentIds={createTargetStudentIds}
                hidePageHeader
                onCancel={() => setIsCreateDialogOpen(false)}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  setCheckedStudentIds([]);
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="flex h-[min(92vh,880px)] max-h-[92vh] w-[95vw] max-w-[1060px] flex-col gap-0 overflow-hidden border-transparent bg-[#fcfcfe] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="shrink-0 px-5 py-5">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {editingRecord?.status === 'SUBMITTED' || editingRecord?.status === 'SCORED' ? '抽查评分' : '抽查详情'}
            </DialogTitle>
          </DialogHeader>
          {editingRecord ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pl-5 pr-0 pb-5">
              <SpotCheckForm
                key={editingRecord.id}
                spotCheckId={editingRecord.id}
                hidePageHeader
                onCancel={() => setEditingRecord(null)}
                onSuccess={() => setEditingRecord(null)}
                onSwitchRecord={setEditingRecord}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
