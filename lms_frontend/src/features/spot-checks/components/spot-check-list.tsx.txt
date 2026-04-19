import { startTransition, useDeferredValue, useState } from 'react';
import { ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageSplit, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { SpotCheck, SpotCheckStudent } from '@/types/spot-check';
import { showApiError } from '@/utils/error-handler';
import { useDeleteSpotCheck } from '../api/create-spot-check';
import { useSpotChecks, useSpotCheckStudents } from '../api/get-spot-checks';
import { SpotCheckForm } from './spot-check-form';
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SpotCheck | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpotCheck | null>(null);

  const currentRole = useCurrentRole();
  const deferredStudentSearch = useDeferredValue(studentSearch.trim());
  const { hasCapability } = useAuth();
  const deleteSpotCheck = useDeleteSpotCheck();

  const { data: students = [], isLoading: studentsLoading } = useSpotCheckStudents({
    role: currentRole,
    search: deferredStudentSearch || undefined,
  });
  const filteredStudents = students.filter((student) => matchDepartmentFilter(student, departmentFilter));
  const resolvedSelectedStudentId =
    filteredStudents.length === 0
      ? null
      : selectedStudentId !== null && filteredStudents.some((student) => student.id === selectedStudentId)
        ? selectedStudentId
        : filteredStudents[0].id;

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

  const selectedStudent = filteredStudents.find((student) => student.id === resolvedSelectedStudentId) ?? null;
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
      <PageFillShell>
        <PageHeader
          title="抽查管理"
          icon={<ListChecks className="h-5 w-5" />}
        />

        <PageWorkbench>
          <PageSplit className="min-h-0 flex-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
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
              canCreateSpotCheck={canCreateSpotCheck}
              onCreateSpotCheck={() => setIsCreateDialogOpen(true)}
              onEditRecord={setEditingRecord}
              onDeleteRecord={setDeleteTarget}
              onPageChange={(nextPage) => updatePagination({ page: nextPage })}
              onPageSizeChange={(nextPageSize) => {
                updatePagination({ page: 1, pageSize: nextPageSize });
              }}
            />
          </PageSplit>
        </PageWorkbench>
      </PageFillShell>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-[1060px] overflow-hidden border-transparent bg-[#fcfcfe] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="px-5 py-5">
            <DialogTitle className="text-lg font-semibold text-foreground">新建抽查</DialogTitle>
          </DialogHeader>
          {isCreateDialogOpen ? (
            <div className="max-h-[calc(92vh-69px)] overflow-y-auto px-5 py-4">
              <SpotCheckForm
                initialStudentId={resolvedSelectedStudentId}
                hidePageHeader
                onCancel={() => setIsCreateDialogOpen(false)}
                onSuccess={() => setIsCreateDialogOpen(false)}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-[1060px] overflow-hidden border-transparent bg-[#fcfcfe] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="px-5 py-5">
            <DialogTitle className="text-lg font-semibold text-foreground">编辑抽查</DialogTitle>
          </DialogHeader>
          {editingRecord ? (
            <div className="max-h-[calc(92vh-69px)] overflow-y-auto px-5 py-4">
              <SpotCheckForm
                spotCheckId={editingRecord.id}
                hidePageHeader
                onCancel={() => setEditingRecord(null)}
                onSuccess={() => setEditingRecord(null)}
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
