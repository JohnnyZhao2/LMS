import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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

import { useCreateSpotCheck } from '../api/create-spot-check';
import { useAssignableUsers } from '@/features/tasks/api/get-assignable-users';
import { showApiError } from '@/utils/error-handler';

/**
 * 抽查录入表单组件 - ShadCN UI 版本
 */
export const SpotCheckForm: React.FC = () => {
  const navigate = useNavigate();
  const createSpotCheck = useCreateSpotCheck();
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  // Form state
  const [studentId, setStudentId] = useState<string>('');
  const [content, setContent] = useState('');
  const [score, setScore] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [checkedAt, setCheckedAt] = useState<Date | undefined>(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!studentId) newErrors.student = '请选择学员';
    if (!content.trim()) newErrors.content = '请输入抽查内容';
    if (!score || score < 1 || score > 10) newErrors.score = '请输入1-10分的评分';
    if (!checkedAt) newErrors.checkedAt = '请选择抽查时间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    try {
      await createSpotCheck.mutateAsync({
        student: Number(studentId),
        content,
        score: String(score),
        comment: comment || undefined,
        checked_at: checkedAt!.toISOString(),
      });
      toast.success('抽查记录创建成功');
      navigate('/spot-checks');
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">发起抽查</h2>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">抽查信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>选择学员</Label>
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
            {errors.student && <p className="text-sm text-red-500">{errors.student}</p>}
          </div>

          <div className="space-y-2">
            <Label>抽查内容/主题</Label>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              rows={3}
              placeholder="请输入抽查内容或主题"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {errors.content && <p className="text-sm text-red-500">{errors.content}</p>}
          </div>

          <div className="space-y-2">
            <Label>评分（1-10分）</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
            {errors.score && <p className="text-sm text-red-500">{errors.score}</p>}
          </div>

          <div className="space-y-2">
            <Label>评语（可选）</Label>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              rows={3}
              placeholder="请输入评语（可选）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>抽查时间</Label>
            <DatePicker
              date={checkedAt}
              onDateChange={setCheckedAt}
              placeholder="选择抽查时间"
            />
            {errors.checkedAt && <p className="text-sm text-red-500">{errors.checkedAt}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={createSpotCheck.isPending}
            >
              {createSpotCheck.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              提交
            </Button>
            <Button variant="outline" onClick={() => navigate('/spot-checks')}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpotCheckForm;
