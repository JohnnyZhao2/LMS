import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { ROUTES } from '@/config/routes';

import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useAssignableUsers } from '@/features/tasks/api/get-assignable-users';
import { showApiError } from '@/utils/error-handler';
import { useCreateSpotCheck, useUpdateSpotCheck } from '../api/create-spot-check';
import { useSpotCheckDetail } from '../api/get-spot-checks';

/**
 * 抽查录入表单组件 - ShadCN UI 版本
 */
export const SpotCheckForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { roleNavigate } = useRoleNavigate();
  const isEdit = !!id;
  const spotCheckId = Number(id);
  const createSpotCheck = useCreateSpotCheck();
  const updateSpotCheck = useUpdateSpotCheck();
  const { data: spotCheckDetail, isLoading: detailLoading } = useSpotCheckDetail(spotCheckId);
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  // Form state
  const [studentId, setStudentId] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string | undefined>(undefined);
  const [draftScore, setDraftScore] = useState<number | undefined>(undefined);
  const [draftComment, setDraftComment] = useState<string | undefined>(undefined);
  const [draftCheckedAt, setDraftCheckedAt] = useState<Date | undefined>(() => (id ? undefined : new Date()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSubmitting = createSpotCheck.isPending || updateSpotCheck.isPending;
  const content = isEdit ? (draftContent ?? spotCheckDetail?.content ?? '') : (draftContent ?? '');
  const score = isEdit ? (draftScore ?? Number(spotCheckDetail?.score ?? 80)) : (draftScore ?? 80);
  const comment = isEdit ? (draftComment ?? spotCheckDetail?.comment ?? '') : (draftComment ?? '');
  const checkedAt = isEdit
    ? (draftCheckedAt ?? (spotCheckDetail ? new Date(spotCheckDetail.checked_at) : undefined))
    : draftCheckedAt;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isEdit && !studentId) newErrors.student = '请选择学员';
    if (!content.trim()) newErrors.content = '请输入抽查内容';
    if (score < 0 || score > 100) newErrors.score = '请输入0-100分的评分';
    if (!checkedAt) newErrors.checkedAt = '请选择抽查时间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    const payload = {
      content,
      score: String(score),
      comment: comment || undefined,
      checked_at: checkedAt!.toISOString(),
    };

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
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {isEdit ? '修改抽查' : '发起抽查'}
      </h2>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">
            {isEdit ? '修改抽查信息' : '抽查信息'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>选择学员</Label>
            {isEdit ? (
              <div className="flex min-h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground">
                {detailLoading ? '加载中...' : spotCheckDetail?.student_name}
              </div>
            ) : (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={usersLoading ? '加载中...' : '搜索并选择学员'} />
                </SelectTrigger>
                <SelectContent>
                  {(users || []).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username} ({user.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.student && <p className="text-sm text-destructive-500">{errors.student}</p>}
          </div>

          <div className="space-y-2">
            <Label>抽查内容/主题</Label>
            <textarea
              className="w-full p-3 border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              rows={3}
              placeholder="请输入抽查内容或主题"
              value={content}
              onChange={(e) => setDraftContent(e.target.value)}
            />
            {errors.content && <p className="text-sm text-destructive-500">{errors.content}</p>}
          </div>

          <div className="space-y-2">
            <Label>评分（0-100分）</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setDraftScore(Number(e.target.value))}
            />
            {errors.score && <p className="text-sm text-destructive-500">{errors.score}</p>}
          </div>

          <div className="space-y-2">
            <Label>评语（可选）</Label>
            <textarea
              className="w-full p-3 border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              rows={3}
              placeholder="请输入评语（可选）"
              value={comment}
              onChange={(e) => setDraftComment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>抽查时间</Label>
            <DatePicker
              date={checkedAt}
              onDateChange={setDraftCheckedAt}
              placeholder="选择抽查时间"
            />
            {errors.checkedAt && <p className="text-sm text-destructive-500">{errors.checkedAt}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (isEdit && detailLoading)}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? '保存修改' : '提交'}
            </Button>
            <Button variant="outline" onClick={() => roleNavigate(ROUTES.SPOT_CHECKS)}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpotCheckForm;
