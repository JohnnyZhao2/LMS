import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePracticeResult, useExamResult } from '../api/get-result';
import { QuestionCard } from './question-card';

interface AnswerReviewProps {
  type: 'practice' | 'exam';
}

/**
 * 答题回顾组件（ShadCN UI 版本）
 */
export const AnswerReview: React.FC<AnswerReviewProps> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const submissionParam = searchParams.get('submission');
  const parsedSubmissionId = submissionParam ? Number(submissionParam) : undefined;
  const submissionId = Number.isNaN(parsedSubmissionId ?? NaN) ? undefined : parsedSubmissionId;
  const isPractice = type === 'practice';

  const practiceResultQuery = usePracticeResult(submissionId, isPractice);
  const examResultQuery = useExamResult(submissionId, !isPractice);
  const { data, isLoading } = isPractice ? practiceResultQuery : examResultQuery;
  const reviewContainerClass = 'space-y-4 pb-4';

  if (!submissionId) {
    return (
      <div className={reviewContainerClass}>
        <Card>
          <CardContent className="p-6 text-center text-text-muted">缺少有效的 submission 参数</CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={reviewContainerClass}>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
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
      <div className={reviewContainerClass}>
        <Card>
          <CardContent className="p-6 text-center text-text-muted">结果不存在</CardContent>
        </Card>
      </div>
    );
  }

  const correctCount = data.answers.filter((a) => a.is_correct).length;

  return (
    <div className={reviewContainerClass}>
      {/* 统计卡片 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-6">{data.quiz_title}</h3>
          <div className={`grid gap-6 ${isPractice ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <div className="text-sm text-text-muted mb-1">总分</div>
              <div className="text-2xl font-bold">
                <span className="text-primary-500">{data.obtained_score || 0}</span>
                <span className="text-text-muted text-lg font-normal"> / {data.total_score}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">答对题数</div>
              <div className="text-2xl font-bold">
                <span className="text-success-500">{correctCount}</span>
                <span className="text-text-muted text-lg font-normal"> / {data.answers.length}</span>
              </div>
            </div>
            {isPractice ? (
              <div>
                <div className="text-sm text-text-muted mb-1">答题次数</div>
                <div className="text-2xl font-bold text-foreground">{data.attempt_number}</div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 答题详情 */}
      <Card>
        <CardHeader>
          <CardTitle>答题详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.answers.map((answer, index) => (
            <QuestionCard
              key={answer.id}
              answer={answer}
              userAnswer={answer.user_answer}
              onAnswerChange={() => undefined}
              disabled
              showResult
              questionNumber={index + 1}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
