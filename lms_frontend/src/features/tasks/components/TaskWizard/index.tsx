/**
 * TaskWizard - Task creation wizard
 * Requirements: 14.2, 14.5, 14.9, 14.13
 * - Combines three step components
 * - Implements step navigation and data passing
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ArrowRight, ArrowLeft, Check, Save } from 'lucide-react';
import { StepBasicInfo, type BasicInfoData } from './StepBasicInfo';
import { StepResources, type ResourcesData } from './StepResources';
import { StepAssignees, type AssigneesData } from './StepAssignees';
import { useCreateTask, type TaskCreateRequest } from '../../api/task-management';
import type { TaskType } from '@/types/domain';

type WizardStep = 'BASIC' | 'RESOURCES' | 'ASSIGNEES' | 'REVIEW';

const STEPS: WizardStep[] = ['BASIC', 'RESOURCES', 'ASSIGNEES', 'REVIEW'];

const STEP_LABELS: Record<WizardStep, string> = {
  BASIC: '基本信息',
  RESOURCES: '选择资源',
  ASSIGNEES: '选择学员',
  REVIEW: '确认提交',
};

interface TaskWizardProps {
  isOpen: boolean;
  onClose: () => void;
  // Pre-filled data from quick publish
  initialType?: TaskType;
  initialQuizIds?: number[];
  initialKnowledgeIds?: number[];
  // Skip to specific step
  startStep?: WizardStep;
}

interface WizardData {
  basic: BasicInfoData;
  resources: ResourcesData;
  assignees: AssigneesData;
}

const initialData: WizardData = {
  basic: {
    type: 'LEARNING',
    title: '',
    description: '',
    deadline: '',
  },
  resources: {
    knowledge_ids: [],
    quiz_ids: [],
  },
  assignees: {
    assignee_ids: [],
  },
};

export function TaskWizard({ 
  isOpen, 
  onClose, 
  initialType,
  initialQuizIds,
  initialKnowledgeIds,
  startStep = 'BASIC',
}: TaskWizardProps) {
  const createTask = useCreateTask();
  
  const [step, setStep] = useState<WizardStep>(startStep);
  const [data, setData] = useState<WizardData>(() => ({
    basic: {
      ...initialData.basic,
      type: initialType || 'LEARNING',
    },
    resources: {
      knowledge_ids: initialKnowledgeIds || [],
      quiz_ids: initialQuizIds || [],
    },
    assignees: initialData.assignees,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate current step
  const validateStep = useCallback((currentStep: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'BASIC':
        if (!data.basic.title.trim()) {
          newErrors.title = '请输入任务标题';
        }
        if (!data.basic.deadline) {
          newErrors.deadline = '请选择截止日期';
        }
        if (data.basic.type === 'EXAM') {
          if (!data.basic.start_time) {
            newErrors.start_time = '请选择考试开始时间';
          }
          if (!data.basic.duration || data.basic.duration <= 0) {
            newErrors.duration = '请输入有效的考试时长';
          }
          if (data.basic.pass_score === undefined || data.basic.pass_score < 0) {
            newErrors.pass_score = '请输入有效的及格分数';
          }
          // Validate start_time is before deadline
          if (data.basic.start_time && data.basic.deadline) {
            if (new Date(data.basic.start_time) >= new Date(data.basic.deadline)) {
              newErrors.start_time = '开始时间必须早于截止时间';
            }
          }
        }
        break;

      case 'RESOURCES':
        if (data.basic.type === 'LEARNING' && data.resources.knowledge_ids.length === 0) {
          newErrors.knowledge_ids = '请至少选择一个知识文档';
        }
        if (data.basic.type === 'PRACTICE' && data.resources.quiz_ids.length === 0) {
          newErrors.quiz_ids = '请至少选择一个试卷';
        }
        if (data.basic.type === 'EXAM' && data.resources.quiz_ids.length !== 1) {
          newErrors.quiz_ids = '考试任务必须选择一个试卷';
        }
        break;

      case 'ASSIGNEES':
        if (data.assignees.assignee_ids.length === 0) {
          newErrors.assignee_ids = '请至少选择一个学员';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data]);

  const handleNext = () => {
    if (!validateStep(step)) return;
    
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
      setErrors({});
    }
  };

  const handlePrev = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('ASSIGNEES')) return;

    try {
      let request: TaskCreateRequest;

      if (data.basic.type === 'LEARNING') {
        request = {
          type: 'LEARNING',
          title: data.basic.title,
          description: data.basic.description || undefined,
          deadline: data.basic.deadline,
          knowledge_ids: data.resources.knowledge_ids,
          assignee_ids: data.assignees.assignee_ids,
        };
      } else if (data.basic.type === 'PRACTICE') {
        request = {
          type: 'PRACTICE',
          title: data.basic.title,
          description: data.basic.description || undefined,
          deadline: data.basic.deadline,
          quiz_ids: data.resources.quiz_ids,
          knowledge_ids: data.resources.knowledge_ids.length > 0 
            ? data.resources.knowledge_ids 
            : undefined,
          assignee_ids: data.assignees.assignee_ids,
        };
      } else {
        request = {
          type: 'EXAM',
          title: data.basic.title,
          description: data.basic.description || undefined,
          deadline: data.basic.deadline,
          start_time: data.basic.start_time!,
          duration: data.basic.duration!,
          pass_score: data.basic.pass_score!,
          quiz_id: data.resources.quiz_ids[0],
          assignee_ids: data.assignees.assignee_ids,
        };
      }

      await createTask.mutateAsync(request);
      onClose();
      // Reset form
      setData(initialData);
      setStep('BASIC');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form after close
    setTimeout(() => {
      setData(initialData);
      setStep('BASIC');
      setErrors({});
    }, 300);
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="新建任务"
      size="lg"
    >
      <div className="space-y-6">
        {/* Steps Indicator */}
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-white/10 -z-10" />
          {STEPS.map((s, i) => {
            const isCompleted = currentStepIndex > i;
            const isCurrent = step === s;
            return (
              <div 
                key={s} 
                className={`flex flex-col items-center gap-2 ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-text-muted'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  isCurrent 
                    ? 'bg-primary text-black scale-110 shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
                    : isCompleted 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-background border border-white/10'
                }`}>
                  {isCompleted ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">
                  {STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px] max-h-[60vh] overflow-y-auto px-1">
          {step === 'BASIC' && (
            <StepBasicInfo
              data={data.basic}
              onChange={(basic) => setData(prev => ({ ...prev, basic }))}
              errors={errors}
            />
          )}

          {step === 'RESOURCES' && (
            <StepResources
              taskType={data.basic.type}
              data={data.resources}
              onChange={(resources) => setData(prev => ({ ...prev, resources }))}
              errors={errors}
            />
          )}

          {step === 'ASSIGNEES' && (
            <StepAssignees
              data={data.assignees}
              onChange={(assignees) => setData(prev => ({ ...prev, assignees }))}
              errors={errors}
            />
          )}

          {step === 'REVIEW' && (
            <ReviewStep data={data} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <Button 
            variant="ghost" 
            disabled={step === 'BASIC'} 
            onClick={handlePrev}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
          </Button>
          
          {step === 'REVIEW' ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={createTask.isPending}
            >
              {createTask.isPending ? '创建中...' : '创建任务'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              下一步 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Review Step Component
function ReviewStep({ data }: { data: WizardData }) {
  const taskTypeLabels: Record<TaskType, string> = {
    LEARNING: '学习任务',
    PRACTICE: '练习任务',
    EXAM: '考试任务',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Check className="text-primary" /> 确认任务信息
      </h3>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <h4 className="text-sm font-semibold text-text-muted uppercase">基本信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-text-muted">任务类型</span>
              <div className="text-white font-medium">{taskTypeLabels[data.basic.type]}</div>
            </div>
            <div>
              <span className="text-xs text-text-muted">截止时间</span>
              <div className="text-white font-medium">
                {data.basic.deadline ? new Date(data.basic.deadline).toLocaleString('zh-CN') : '-'}
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">任务标题</span>
            <div className="text-white font-medium">{data.basic.title}</div>
          </div>
          {data.basic.description && (
            <div>
              <span className="text-xs text-text-muted">任务描述</span>
              <div className="text-white text-sm">{data.basic.description}</div>
            </div>
          )}
          {data.basic.type === 'EXAM' && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div>
                <span className="text-xs text-text-muted">开始时间</span>
                <div className="text-white font-medium">
                  {data.basic.start_time ? new Date(data.basic.start_time).toLocaleString('zh-CN') : '-'}
                </div>
              </div>
              <div>
                <span className="text-xs text-text-muted">考试时长</span>
                <div className="text-white font-medium">{data.basic.duration} 分钟</div>
              </div>
              <div>
                <span className="text-xs text-text-muted">及格分数</span>
                <div className="text-white font-medium">{data.basic.pass_score} 分</div>
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <h4 className="text-sm font-semibold text-text-muted uppercase">选择的资源</h4>
          {data.resources.knowledge_ids.length > 0 && (
            <div>
              <span className="text-xs text-text-muted">知识文档</span>
              <div className="text-white font-medium">{data.resources.knowledge_ids.length} 个</div>
            </div>
          )}
          {data.resources.quiz_ids.length > 0 && (
            <div>
              <span className="text-xs text-text-muted">试卷</span>
              <div className="text-white font-medium">{data.resources.quiz_ids.length} 个</div>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <h4 className="text-sm font-semibold text-text-muted uppercase">分配学员</h4>
          <div>
            <span className="text-xs text-text-muted">已选择学员</span>
            <div className="text-white font-medium">{data.assignees.assignee_ids.length} 人</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export step components
export { StepBasicInfo } from './StepBasicInfo';
export { StepResources } from './StepResources';
export { StepAssignees } from './StepAssignees';
export type { BasicInfoData, ResourcesData, AssigneesData };
