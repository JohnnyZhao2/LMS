import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

import { useGradingDetail } from '../api/get-grading-detail';
import { useSubmitGrade } from '../api/submit-grade';
import type { Answer } from '@/types/api';

/**
 * 评分表单组件（ShadCN UI 版本）
 */
export const GradingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useGradingDetail(Number(id));
  const submitGrade = useSubmitGrade();

  const [grades, setGrades] = useState<Record<number, { score: string; comment?: string }>>({});

  const handleGrade = (answerId: number, score: string, comment?: string) => {
    setGrades((prev) => ({
      ...prev,
      [answerId]: { score, comment },
    }));
  };

  const handleSubmit = async (answerId: number) => {
    const grade = grades[answerId];
    if (!grade) {
      toast.error('请填写分数');
      return;
    }

    try {
      await submitGrade.mutateAsync({
        submissionId: Number(id),
        data: {
          answer_id: answerId,
          obtained_score: grade.score,
          comment: grade.comment,
        },
      });
      toast.success('评分成功');
    } catch {
      toast.error('评分失败');
    }
  };

  const handleFullScore = (answer: Answer) => {
    handleGrade(answer.id, answer.score || '0');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">提交记录不存在</CardContent>
      </Card>
    );
  }

  // 筛选出需要评分的主观题
  const subjectiveAnswers = data.answers.filter((a) => a.question_type === 'SHORT_ANSWER');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/grading')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回列表
        </Button>
        <h1 className="text-2xl font-semibold m-0">评分详情</h1>
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-24 border-r">学员</td>
                  <td className="px-4 py-3 w-1/3">{data.user_name}</td>
                  <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-24 border-r border-l">试卷</td>
                  <td className="px-4 py-3">{data.quiz_title}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r">任务</td>
                  <td className="px-4 py-3">{data.task_title}</td>
                  <td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 border-r border-l">总分</td>
                  <td className="px-4 py-3">{data.total_score}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 主观题评分 */}
      {subjectiveAnswers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">没有需要评分的主观题</CardContent>
        </Card>
      ) : (
        subjectiveAnswers.map((answer, index) => (
          <Card key={answer.id}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="flex-1">{answer.question_content}</span>
                <span className="text-sm font-normal text-gray-500">({answer.score}分)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 学员答案 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">学员答案:</Label>
                <div className="mt-2 text-gray-900 whitespace-pre-wrap">
                  {(answer.user_answer?.value as string) || '未作答'}
                </div>
              </div>

              {/* 评分输入 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`score-${answer.id}`}>得分:</Label>
                  <Input
                    id={`score-${answer.id}`}
                    type="number"
                    min={0}
                    max={Number(answer.score)}
                    value={grades[answer.id]?.score || ''}
                    onChange={(e) => handleGrade(answer.id, e.target.value, grades[answer.id]?.comment)}
                    className="w-20"
                  />
                  <span className="text-gray-500">/ {answer.score}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleFullScore(answer)}>
                  一键满分
                </Button>
              </div>

              {/* 评语输入 */}
              <div className="space-y-2">
                <Label htmlFor={`comment-${answer.id}`}>评语:</Label>
                <Textarea
                  id={`comment-${answer.id}`}
                  rows={2}
                  placeholder="输入评语（可选）"
                  value={grades[answer.id]?.comment || ''}
                  onChange={(e) => handleGrade(answer.id, grades[answer.id]?.score || '0', e.target.value)}
                />
              </div>

              {/* 确认评分按钮 */}
              <Button onClick={() => handleSubmit(answer.id)} disabled={submitGrade.isPending}>
                <CheckCircle className="w-4 h-4 mr-1" />
                确认评分
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
