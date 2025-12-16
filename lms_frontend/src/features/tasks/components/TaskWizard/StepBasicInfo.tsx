/**
 * StepBasicInfo - Task creation wizard step 1
 * Requirements: 14.2, 14.3, 14.4
 * - Task type selection (learning/practice/exam)
 * - Title, description, deadline input
 * - Exam-specific: start time, duration, pass score
 */

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FileText, Target, ClipboardCheck, Calendar, Clock, Award } from 'lucide-react';
import type { TaskType } from '@/types/domain';

export interface BasicInfoData {
  type: TaskType;
  title: string;
  description: string;
  deadline: string;
  // Exam-specific fields
  start_time?: string;
  duration?: number;
  pass_score?: number;
}

interface StepBasicInfoProps {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  errors?: Partial<Record<keyof BasicInfoData, string>>;
}

const TASK_TYPES = [
  { 
    id: 'LEARNING' as TaskType, 
    icon: FileText, 
    label: '学习任务', 
    desc: '指派学员学习指定知识文档' 
  },
  { 
    id: 'PRACTICE' as TaskType, 
    icon: Target, 
    label: '练习任务', 
    desc: '指派学员完成试卷练习，可重复提交' 
  },
  { 
    id: 'EXAM' as TaskType, 
    icon: ClipboardCheck, 
    label: '考试任务', 
    desc: '正式考核，仅允许一次作答' 
  },
];

export function StepBasicInfo({ data, onChange, errors }: StepBasicInfoProps) {
  const handleChange = <K extends keyof BasicInfoData>(
    field: K, 
    value: BasicInfoData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const handleTypeChange = (type: TaskType) => {
    // Reset exam-specific fields when switching away from exam
    if (type !== 'EXAM') {
      onChange({
        ...data,
        type,
        start_time: undefined,
        duration: undefined,
        pass_score: undefined,
      });
    } else {
      onChange({
        ...data,
        type,
        duration: 60, // Default 60 minutes
        pass_score: 60, // Default 60 points
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Task Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">选择任务类型</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TASK_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id)}
              className={`p-5 rounded-xl border text-left transition-all group ${
                data.type === type.id 
                  ? 'bg-primary/10 border-primary text-white' 
                  : 'bg-white/5 border-transparent hover:border-white/10'
              }`}
            >
              <type.icon 
                size={28} 
                className={`mb-3 ${
                  data.type === type.id 
                    ? 'text-primary' 
                    : 'text-text-muted'
                } transition-colors`} 
              />
              <div className="font-semibold text-base mb-1">{type.label}</div>
              <div className="text-sm text-text-muted leading-relaxed">
                {type.desc}
              </div>
            </button>
          ))}
        </div>
        {errors?.type && (
          <p className="text-sm text-red-400">{errors.type}</p>
        )}
      </div>

      {/* Basic Info Fields */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-white">基本信息</h3>
        
        {/* Title */}
        <div>
          <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
            任务标题 <span className="text-red-400">*</span>
          </label>
          <Input
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入任务标题"
            error={errors?.title}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
            任务描述
          </label>
          <Textarea
            value={data.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="请输入任务描述（可选）"
            rows={3}
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
            <Calendar className="inline-block mr-1 h-4 w-4" />
            截止日期 <span className="text-red-400">*</span>
          </label>
          <Input
            type="datetime-local"
            value={data.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            error={errors?.deadline}
          />
        </div>
      </div>

      {/* Exam-specific Fields */}
      {data.type === 'EXAM' && (
        <div className="space-y-5 p-5 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            考试设置
          </h3>
          
          {/* Start Time */}
          <div>
            <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
              <Calendar className="inline-block mr-1 h-4 w-4" />
              开始时间 <span className="text-red-400">*</span>
            </label>
            <Input
              type="datetime-local"
              value={data.start_time || ''}
              onChange={(e) => handleChange('start_time', e.target.value)}
              error={errors?.start_time}
            />
            <p className="text-xs text-text-muted mt-1">
              学员只能在开始时间到截止时间之间进入考试
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
              <Clock className="inline-block mr-1 h-4 w-4" />
              考试时长（分钟） <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min={1}
              max={480}
              value={data.duration || ''}
              onChange={(e) => handleChange('duration', parseInt(e.target.value) || undefined)}
              placeholder="60"
              error={errors?.duration}
            />
          </div>

          {/* Pass Score */}
          <div>
            <label className="text-xs uppercase text-text-muted font-bold mb-2 block">
              <Award className="inline-block mr-1 h-4 w-4" />
              及格分数 <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.pass_score || ''}
              onChange={(e) => handleChange('pass_score', parseInt(e.target.value) || undefined)}
              placeholder="60"
              error={errors?.pass_score}
            />
          </div>
        </div>
      )}
    </div>
  );
}
