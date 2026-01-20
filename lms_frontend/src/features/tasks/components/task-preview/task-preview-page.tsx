import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, FileCheck } from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@/components/ui';
import { useTaskDetail } from '../../api/get-task-detail';
import { ProgressMonitoringTab } from './progress-monitoring-tab';
import { GradingCenterTab } from './grading-center-tab';

export const TaskPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = Number(id);

  const defaultTab = searchParams.get('tab') || 'progress';
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);

  const { data: task, isLoading } = useTaskDetail(taskId);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <p>任务不存在</p>
        <Button variant="outline" onClick={() => navigate('/tasks')} className="mt-4">
          返回任务列表
        </Button>
      </div>
    );
  }

  const quizIds = task.quizzes?.map((quiz) => quiz.quiz) ?? [];
  const resolvedQuizId = quizIds.includes(selectedQuizId ?? -1) ? selectedQuizId : quizIds[0] ?? null;
  const activeQuizId = resolvedQuizId ?? null;
  const activeQuiz = task.quizzes?.find((quiz) => quiz.quiz === activeQuizId) || task.quizzes?.[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tasks')}
            className="h-10 w-10 rounded-lg hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
            <div className="mt-1.5">
              {activeTab === 'grading' && task.quizzes?.length ? (
                <Select
                  value={activeQuizId?.toString() || ''}
                  onValueChange={(value) => setSelectedQuizId(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[220px] text-xs">
                    <SelectValue placeholder="选择试卷" />
                  </SelectTrigger>
                  <SelectContent>
                    {task.quizzes.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.quiz.toString()}>
                        {quiz.quiz_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-slate-500">
                  {activeQuiz?.quiz_title || '综合测验'}
                </p>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="progress" className="flex items-center gap-2 cursor-pointer transition-all duration-200">
              <BarChart3 className="h-4 w-4" />
              进度监控
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex items-center gap-2 cursor-pointer transition-all duration-200">
              <FileCheck className="h-4 w-4" />
              阅卷中心
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      {activeTab === 'progress' && <ProgressMonitoringTab taskId={taskId} />}
      {activeTab === 'grading' && <GradingCenterTab taskId={taskId} quizId={activeQuizId} />}
    </div>
  );
};
