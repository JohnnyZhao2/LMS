import { useMemo, useState } from 'react';
import { Layers3, ListChecks, Loader2, Plus, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

import { UserAvatar } from '@/components/common/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ROUTES } from '@/config/routes';
import { useAssignableUsers } from '@/features/tasks/api/get-assignable-users';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import type { SpotCheckItem } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { useCreateSpotCheck, useUpdateSpotCheck } from '../api/create-spot-check';
import { useSpotCheckDetail } from '../api/get-spot-checks';
import { SpotCheckItemEditor } from './spot-check-item-editor';

const createEmptyItem = (): SpotCheckItem => ({
  topic: '',
  content: '',
  score: '80',
  comment: '',
});

const normalizeItems = (items?: SpotCheckItem[]) => {
  if (!items || items.length === 0) {
    return [createEmptyItem()];
  }

  return items.map((item) => ({
    topic: item.topic ?? '',
    content: item.content ?? '',
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

export const SpotCheckForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { roleNavigate } = useRoleNavigate();
  const isEdit = Boolean(id);
  const spotCheckId = Number(id);
  const createSpotCheck = useCreateSpotCheck();
  const updateSpotCheck = useUpdateSpotCheck();
  const { data: spotCheckDetail, isLoading: detailLoading } = useSpotCheckDetail(spotCheckId);
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  const [studentId, setStudentId] = useState('');
  const [draftItems, setDraftItems] = useState<SpotCheckItem[] | null>(isEdit ? null : [createEmptyItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const baseItems = useMemo(() => {
    if (isEdit) {
      return spotCheckDetail ? normalizeItems(spotCheckDetail.items) : [];
    }
    return [createEmptyItem()];
  }, [isEdit, spotCheckDetail]);

  const items = draftItems ?? baseItems;

  const isSubmitting = createSpotCheck.isPending || updateSpotCheck.isPending;
  const selectedStudent = useMemo(() => {
    if (isEdit) {
      return spotCheckDetail
        ? {
            id: spotCheckDetail.student,
            username: spotCheckDetail.student_name,
            employee_id: spotCheckDetail.student_employee_id,
            avatar_key: spotCheckDetail.student_avatar_key,
            department: spotCheckDetail.student_department
              ? { name: spotCheckDetail.student_department }
              : undefined,
          }
        : null;
    }

    return (users || []).find((user) => String(user.id) === studentId) ?? null;
  }, [isEdit, spotCheckDetail, studentId, users]);

  const averageScore = useMemo(() => calculateAverageScore(items), [items]);

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
    content: item.content?.trim() ?? '',
    score: item.score,
    comment: item.comment?.trim() ?? '',
  }));

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('请先补全每个主题的必填项');
      return;
    }

    const payload = { items: buildPayloadItems() };

    try {
      if (isEdit) {
        await updateSpotCheck.mutateAsync({
          id: spotCheckId,
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
      roleNavigate(ROUTES.SPOT_CHECKS);
    } catch (error) {
      showApiError(error, isEdit ? '修改失败' : '创建失败');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-fadeIn">
      <PageHeader
        title={isEdit ? '修改抽查' : '发起抽查'}
        icon={<ListChecks className="h-5 w-5" />}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border border-border/70 bg-[radial-gradient(circle_at_top,#f5f9ff,transparent_55%),linear-gradient(180deg,#ffffff,#f7f9fc)] shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3 pb-4">
            <Badge variant="info" className="w-fit">抽查对象</Badge>
            <CardTitle className="text-lg">先锁定本次抽查学员</CardTitle>
            <p className="text-sm text-text-muted">系统会自动记录创建时间，前端只负责录入主题表现。</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {isEdit ? (
              <div className="rounded-2xl border border-border/70 bg-white/90 p-4">
                {detailLoading && !selectedStudent ? (
                  <p className="text-sm text-text-muted">加载学员信息中...</p>
                ) : selectedStudent ? (
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarKey={selectedStudent.avatar_key} name={selectedStudent.username} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{selectedStudent.username}</p>
                      <p className="text-sm text-text-muted">
                        {selectedStudent.employee_id || '未填写工号'}
                        {selectedStudent.department?.name ? ` · ${selectedStudent.department.name}` : ''}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <SearchableSelect
                  items={users || []}
                  value={studentId}
                  onSelect={(value) => setStudentId(String(value))}
                  placeholder={usersLoading ? '加载学员中...' : '搜索并选择学员'}
                  searchPlaceholder="搜索姓名或工号"
                  icon={<UserRound className="h-4 w-4" />}
                  getLabel={(user) => `${user.username} · ${user.employee_id || '未填写工号'}`}
                  getValue={(user) => String(user.id)}
                  emptyMessage="没有匹配的学员"
                />
                {errors.student ? <p className="text-sm text-destructive-500">{errors.student}</p> : null}
              </div>
            )}

            {selectedStudent ? (
              <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  当前录入对象
                </div>
                <div className="flex items-center gap-3">
                  <UserAvatar avatarKey={selectedStudent.avatar_key} name={selectedStudent.username} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{selectedStudent.username}</p>
                    <p className="text-sm text-text-muted">{selectedStudent.employee_id || '未填写工号'}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/60 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">主题数量</p>
                <p className="mt-2 text-3xl font-black text-foreground">{items.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">预估均分</p>
                <p className="mt-2 text-3xl font-black text-foreground">{averageScore}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border/80 bg-white/70 p-4 text-sm text-text-muted">
              {isEdit && spotCheckDetail
                ? `该记录创建于 ${dayjs(spotCheckDetail.created_at).format('YYYY-MM-DD HH:mm')}`
                : '提交后会以系统创建时间作为抽查时间，无需手动填写。'}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,251,0.95))] shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
                  <Layers3 className="h-4 w-4" />
                  多主题抽查
                </div>
                <h2 className="text-2xl font-semibold text-foreground">按主题逐条记录表现，不再压缩成一条总评</h2>
                <p className="mt-2 text-sm text-text-muted">每个主题都可以单独写抽查内容、评分和评语，便于复盘和追踪问题。</p>
              </div>
              <Button variant="outline" onClick={handleAddItem} className="h-11">
                <Plus className="h-4 w-4" />
                新增主题
              </Button>
            </CardContent>
          </Card>

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

          <Card className="border border-border/70 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-foreground">{isEdit ? '确认更新这次抽查记录' : '确认提交这次抽查记录'}</p>
                <p className="text-sm text-text-muted">保存后会回到抽查列表，系统自动记录创建时间。</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => roleNavigate(ROUTES.SPOT_CHECKS)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || (isEdit && detailLoading && !spotCheckDetail)}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isEdit ? '保存修改' : '提交抽查'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpotCheckForm;
