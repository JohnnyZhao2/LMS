import { startTransition, useDeferredValue, useState } from 'react';
import { ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CircleButton } from '@/components/ui/circle-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import {
  PageFillShell,
  PageSplit,
  PageWorkbench,
} from '@/components/ui/page-shell';
import {
  DESKTOP_SEARCH_INPUT_CLASSNAME,
  SearchInput,
} from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAuth } from '@/lib/auth-context';
import { useCurrentRole } from '@/hooks/use-current-role';
import type {
  SpotCheck,
  SpotCheckRecordFilter,
  SpotCheckStudent,
} from '@/features/spot-checks/types/spot-check';
import { showApiError } from '@/lib/api-error-handler';
import {
  useDeleteSpotCheck,
  useSpotCheckStudents,
  useSpotChecks,
} from '@/features/spot-checks/api/spot-checks-queries';
import { SpotCheckForm } from '@/features/spot-checks/components/spot-check-form';
import { SPOT_CHECK_FORM_DIALOG_CLASSNAME } from '@/features/spot-checks/constants/spot-check-dialog';
import { SpotCheckRecordList } from '@/features/spot-checks/components/spot-check-record-list';
import {
  SpotCheckStudentPanel,
  type SpotCheckDepartmentFilter,
} from '@/features/spot-checks/components/spot-check-student-panel';

const matchDepartmentFilter = (
  student: SpotCheckStudent,
  filter: SpotCheckDepartmentFilter,
) => {
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
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [checkedStudentIds, setCheckedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [recordFilter, setRecordFilter] =
    useState<SpotCheckRecordFilter>('all');
  const [departmentFilter, setDepartmentFilter] =
    useState<SpotCheckDepartmentFilter>('all');
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(20);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SpotCheck | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpotCheck | null>(null);

  const currentRole = useCurrentRole();
  const deferredStudentSearch = useDeferredValue(studentSearch.trim());
  const deferredTopicSearch = useDeferredValue(topicSearch.trim());
  const { hasCapability } = useAuth();
  const deleteSpotCheck = useDeleteSpotCheck();

  const { data: students = [], isLoading: studentsLoading } =
    useSpotCheckStudents({
      role: currentRole,
      search: deferredStudentSearch || undefined,
    });
  const filteredStudents = students.filter((student) =>
    matchDepartmentFilter(student, departmentFilter),
  );
  const filteredStudentIdSet = new Set(
    filteredStudents.map((student) => student.id),
  );
  const resolvedSelectedStudentId =
    selectedStudentId !== null &&
    filteredStudents.some((student) => student.id === selectedStudentId)
      ? selectedStudentId
      : null;
  // 勾选只保留当前筛选可见的学员
  const visibleCheckedStudentIds = checkedStudentIds.filter((id) =>
    filteredStudentIdSet.has(id),
  );

  const status =
    recordFilter === 'pending-score'
      ? 'SUBMITTED'
      : recordFilter === 'pending-fill'
        ? 'PENDING'
        : undefined;

  const { data: recordsData, isLoading: recordsLoading } = useSpotChecks({
    page: recordPage,
    pageSize: recordPageSize,
    role: currentRole,
    studentId: resolvedSelectedStudentId ?? undefined,
    status,
    topic: deferredTopicSearch || undefined,
  });

  const records = recordsData?.results ?? [];
  const selectedStudent =
    filteredStudents.find(
      (student) => student.id === resolvedSelectedStudentId,
    ) ?? null;

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

  const handleSelectStudent = (studentId: number | null) => {
    setCheckedStudentIds([]);
    setRecordPage(1);
    startTransition(() => {
      setSelectedStudentId(studentId);
    });
  };

  const handleStudentSearchChange = (value: string) => {
    setStudentSearch(value);
    setRecordPage(1);
  };

  const handleToggleCheckStudent = (studentId: number) => {
    setSelectedStudentId(null);
    setCheckedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleToggleCheckAll = (selectAll: boolean) => {
    if (!selectAll) {
      // 仅清空当前可见勾选，保留筛选外已选
      setCheckedStudentIds((prev) =>
        prev.filter((id) => !filteredStudentIdSet.has(id)),
      );
      return;
    }
    // 合并：当前不可见已选 ∪ 当前可见全部
    setCheckedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((student) => next.add(student.id));
      return [...next];
    });
  };

  const createTargetStudentIds =
    visibleCheckedStudentIds.length > 0
      ? visibleCheckedStudentIds
      : resolvedSelectedStudentId === null
        ? []
        : [resolvedSelectedStudentId];

  /** 发起对象：已勾选的多选学员，或当前单选学员 */
  const createTargetStudents = filteredStudents.filter((student) =>
    createTargetStudentIds.includes(student.id),
  );

  const handleRecordFilterChange = (value: SpotCheckRecordFilter) => {
    setRecordFilter(value);
    setRecordPage(1);
  };

  const handleTopicSearchChange = (value: string) => {
    setTopicSearch(value);
    setRecordPage(1);
  };

  return (
    <>
      <PageFillShell>
        <PageHeader
          title="抽查任务"
          icon={<ListChecks className="h-5 w-5" />}
        />

        <PageWorkbench className="gap-4">
          <PageSplit className="min-h-0 flex-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
            <div className="min-h-0 xl:row-span-2">
              <SpotCheckStudentPanel
                students={filteredStudents}
                selectedStudentId={resolvedSelectedStudentId}
                checkedStudentIds={visibleCheckedStudentIds}
                searchValue={studentSearch}
                onSearchChange={handleStudentSearchChange}
                onSelectStudent={handleSelectStudent}
                onToggleCheckStudent={handleToggleCheckStudent}
                onToggleCheckAll={handleToggleCheckAll}
                departmentFilter={departmentFilter}
                onDepartmentFilterChange={(value) => {
                  setRecordPage(1);
                  startTransition(() => {
                    setDepartmentFilter(value);
                  });
                }}
                isLoading={studentsLoading}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2.5 xl:col-start-2 xl:row-start-1">
              <SegmentedControl
                options={[
                  { label: '待评分', value: 'pending-score' },
                  { label: '待填写', value: 'pending-fill' },
                  { label: '全部', value: 'all' },
                ]}
                value={recordFilter}
                onChange={(value) =>
                  handleRecordFilterChange(value as SpotCheckRecordFilter)
                }
              />
              <SearchInput
                className={`${DESKTOP_SEARCH_INPUT_CLASSNAME} ml-auto`}
                value={topicSearch}
                onChange={handleTopicSearchChange}
                placeholder="搜索主题"
              />
              {canCreateSpotCheck ? (
                <CircleButton
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={createTargetStudents.length === 0}
                  label="发起抽查"
                />
              ) : null}
            </div>

            <div className="min-h-0 xl:col-start-2 xl:row-start-2">
              <SpotCheckRecordList
                selectedStudent={selectedStudent}
                records={records}
                totalCount={recordsData?.count ?? 0}
                page={recordPage}
                pageSize={recordPageSize}
                isLoading={recordsLoading}
                onEditRecord={setEditingRecord}
                onDeleteRecord={setDeleteTarget}
                onPageChange={setRecordPage}
                onPageSizeChange={(nextPageSize) => {
                  setRecordPageSize(nextPageSize);
                  setRecordPage(1);
                }}
              />
            </div>
          </PageSplit>
        </PageWorkbench>
      </PageFillShell>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={SPOT_CHECK_FORM_DIALOG_CLASSNAME}>
          <DialogHeader className="shrink-0 px-5 py-5">
            <DialogTitle className="text-foreground text-lg font-semibold">
              发起抽查
            </DialogTitle>
          </DialogHeader>
          {isCreateDialogOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pr-0 pb-5 pl-5">
              <SpotCheckForm
                students={createTargetStudents}
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

      <Dialog
        open={!!editingRecord}
        onOpenChange={(open) => !open && setEditingRecord(null)}
      >
        <DialogContent className={SPOT_CHECK_FORM_DIALOG_CLASSNAME}>
          <DialogHeader className="shrink-0 px-5 py-5">
            <DialogTitle className="text-foreground text-lg font-semibold">
              {editingRecord?.status === 'SUBMITTED' ||
              editingRecord?.status === 'SCORED'
                ? '抽查评分'
                : '抽查详情'}
            </DialogTitle>
          </DialogHeader>
          {editingRecord ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pr-0 pb-5 pl-5">
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
