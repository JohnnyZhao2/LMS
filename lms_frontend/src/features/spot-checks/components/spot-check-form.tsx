import { useState } from 'react';
import { ListChecks, Loader2, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PageSplit } from '@/components/ui/page-shell';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ROUTES } from '@/config/routes';
import { useAssignableUsers } from '@/features/tasks/api/get-assignable-users';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import type { SpotCheckItem } from '@/types/spot-check';
import { showApiError } from '@/utils/error-handler';
import { useCreateSpotCheck, useUpdateSpotCheck } from '../api/create-spot-check';
import { useSpotCheckDetail } from '../api/get-spot-checks';
import { SpotCheckItemEditor } from './spot-check-item-editor';

const createEmptyItem = (): SpotCheckItem => ({
  topic: '',
  score: '80',
  comment: '',
});

const normalizeItems = (items: SpotCheckItem[]) => {
  if (items.length === 0) {
    return [createEmptyItem()];
  }

  return items.map((item) => ({
    topic: item.topic ?? '',
    score: item.score ?? '80',
    comment: item.comment ?? '',
  }));
};

const calculateAverageScore = (items: SpotCheckItem[]) => {
  const validScores = items
    .map((item) => Number(item.score))
    .filter((score) => !Number.isNaN(score));

  if (validScores.length === 0) {
    return '--';
  }

  return (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1);
};

interface SelectedStudentInfo {
  id: number;
  username: string;
  employee_id?: string | null;
  avatar_key?: string | null;
  department?: { name: string };
}

interface SpotCheckFormProps {
  spotCheckId?: number;
  initialStudentId?: number | null;
  hidePageHeader?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const StudentCard: React.FC<{ student: SelectedStudentInfo }> = ({ student }) => (
  <div className="rounded-xl bg-white/72 p-4">
    <div className="flex items-center gap-3">
      <UserAvatar avatarKey={student.avatar_key} name={student.username} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{student.username}</p>
        <p className="truncate text-xs text-text-muted">
          {student.employee_id || '未填写工号'}
          {student.department?.name ? ` · ${student.department.name}` : ''}
        </p>
      </div>
    </div>
  </div>
);

const StatBlock: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl bg-white/68 px-4 py-3">
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
  </div>
);

export const SpotCheckForm: React.FC<SpotCheckFormProps> = ({
  spotCheckId,
  initialStudentId = null,
  hidePageHeader = false,
  onCancel,
  onSuccess,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const { roleNavigate } = useRoleNavigate();
  const routeSpotCheckId = routeId ? Number(routeId) : Number.NaN;
  const resolvedSpotCheckId =
    typeof spotCheckId === 'number' ? spotCheckId : Number.isNaN(routeSpotCheckId) ? null : routeSpotCheckId;
  const isEdit = resolvedSpotCheckId !== null;

  const createSpotCheck = useCreateSpotCheck();
  const updateSpotCheck = useUpdateSpotCheck();
  const { data: spotCheckDetail, isLoading: detailLoading } = useSpotCheckDetail(resolvedSpotCheckId ?? 0);
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  const [studentId, setStudentId] = useState(() => (!isEdit && initialStudentId ? String(initialStudentId) : ''));
  const [draftItems, setDraftItems] = useState<SpotCheckItem[] | null>(isEdit ? null : [createEmptyItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const baseItems = isEdit
    ? (spotCheckDetail ? normalizeItems(spotCheckDetail.items) : [])
    : [createEmptyItem()];

  const items = draftItems ?? baseItems;

  const isSubmitting = createSpotCheck.isPending || updateSpotCheck.isPending;
  const selectedStudent: SelectedStudentInfo | null = isEdit
    ? (spotCheckDetail
      ? {
          id: spotCheckDetail.student,
          username: spotCheckDetail.student_name,
          employee_id: spotCheckDetail.student_employee_id,
          avatar_key: spotCheckDetail.student_avatar_key,
          department: spotCheckDetail.student_department
            ? { name: spotCheckDetail.student_department }
            : undefined,
        }
      : null)
    : (users || []).find((user) => String(user.id) === studentId) ?? null;

  const averageScore = calculateAverageScore(items);

  const updateItems = (updater: (current: SpotCheckItem[]) => SpotCheckItem[]) => {
    setDraftItems((prev) => updater(prev ?? baseItems));
  };

  const handleItemChange = (index: number, field: keyof SpotCheckItem, value: string) => {
    updateItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddItem = () => {
    updateItems((current) => [...current, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    updateItems((current) =>
      current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index),
    );
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!isEdit && !studentId) {
      nextErrors.student = '请选择学员';
    }

    items.forEach((item, index) => {
      if (!item.topic.trim()) {
        nextErrors[`item-${index}-topic`] = '请输入抽查主题';
      }

      const score = Number(item.score);
      if (item.score === '' || Number.isNaN(score) || score < 0 || score > 100) {
        nextErrors[`item-${index}-score`] = '请输入 0-100 的评分';
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayloadItems = () => items.map((item) => ({
    topic: item.topic.trim(),
    score: item.score,
    comment: item.comment.trim(),
  }));

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    roleNavigate(ROUTES.SPOT_CHECKS);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('请先补全每个主题的必填项');
      return;
    }

    const payload = { items: buildPayloadItems() };

    try {
      if (isEdit) {
        if (!resolvedSpotCheckId) {
          return;
        }
        await updateSpotCheck.mutateAsync({
          id: resolvedSpotCheckId,
          data: payload,
        });
        toast.success('抽查记录修改成功');
      } else {
        await createSpotCheck.mutateAsync({
          student: Number(studentId),
          ...payload,
        });
        toast.success('抽查记录创建成功');
      }

      if (onSuccess) {
        onSuccess();
        return;
      }
      roleNavigate(ROUTES.SPOT_CHECKS);
    } catch (error) {
      showApiError(error, isEdit ? '修改失败' : '创建失败');
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${hidePageHeader ? '' : 'animate-fadeIn'}`}>
      {!hidePageHeader ? (
        <PageHeader
          title={isEdit ? '编辑抽查' : '新建抽查'}
          icon={<ListChecks className="h-5 w-5" />}
        />
      ) : null}

      <PageSplit className="gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex h-full flex-col gap-5 rounded-2xl bg-[#f6f7fb] p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">学员</p>
            {isEdit ? (
              detailLoading && !selectedStudent ? (
                <div className="rounded-xl bg-white/70 px-4 py-3 text-sm text-text-muted">
                  加载中...
                </div>
              ) : selectedStudent ? (
                <StudentCard student={selectedStudent} />
              ) : null
            ) : (
              <div className="space-y-2">
                <SearchableSelect
                  items={users || []}
                  value={studentId}
                  onSelect={(value) => setStudentId(String(value))}
                  placeholder={usersLoading ? '加载学员中...' : '搜索学员'}
                  searchPlaceholder="姓名或工号"
                  icon={<UserRound className="h-4 w-4" />}
                  className="h-10 rounded-lg bg-white/74 [&_span]:text-[13px]"
                  getLabel={(user) => `${user.username} · ${user.employee_id || '未填写工号'}`}
                  getValue={(user) => String(user.id)}
                  emptyMessage="没有匹配的学员"
                />
                {errors.student ? <p className="text-sm text-destructive-500">{errors.student}</p> : null}
              </div>
            )}
          </div>

          {!isEdit && selectedStudent ? <StudentCard student={selectedStudent} /> : null}

          <div className="grid grid-cols-2 gap-2">
            <StatBlock label="主题" value={items.length} />
            <StatBlock label="均分" value={averageScore} />
          </div>

          {isEdit && spotCheckDetail ? (
            <p className="text-xs text-text-muted">
              创建于 {dayjs(spotCheckDetail.created_at).format('YYYY-MM-DD HH:mm')}
            </p>
          ) : null}
        </aside>

        <section className="h-full space-y-0">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-base font-semibold text-foreground">抽查项</h2>
            <Button variant="outline" onClick={handleAddItem} className="h-9 rounded-lg border-transparent bg-muted/55 px-3 hover:bg-muted">
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <SpotCheckItemEditor
                key={`spot-check-item-${index}`}
                index={index}
                item={item}
                canRemove={items.length > 1}
                errors={errors}
                onChange={handleItemChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
        </section>
      </PageSplit>

      <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
        <Button variant="outline" onClick={handleCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || (isEdit && detailLoading && !spotCheckDetail)}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEdit ? '保存修改' : '保存'}
        </Button>
      </div>
    </div>
  );
};

export default SpotCheckForm;
