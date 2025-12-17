/**
 * SpotCheckForm Component
 * Form for creating spot check records
 * Requirements: 16.2 - 展示抽查记录创建表单
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 * Requirements: 16.4 - 导师仅展示其名下学员供选择
 * Requirements: 16.5 - 室经理仅展示本室学员供选择
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/AuthContext';
import { useMentees } from '@/features/user-mgmt/api/users/get-mentees';
import { useDepartmentMembers } from '@/features/user-mgmt/api/users/get-department-members';
import { useCreateSpotCheck } from '../api/create-spot-check';
import type { CreateSpotCheckRequest } from '../api/types';
import { ROLE_CODES } from '@/config/roles';
import { ClipboardCheck, User, FileText, Star, MessageSquare, AlertCircle } from 'lucide-react';

export interface SpotCheckFormProps {
  /** Callback when spot check is created successfully */
  onSuccess?: () => void;
  /** Callback to cancel form */
  onCancel?: () => void;
}

/**
 * Score options for spot check (0-100)
 */
const SCORE_OPTIONS = [
  { value: '100', label: '100 - 优秀' },
  { value: '90', label: '90 - 良好' },
  { value: '80', label: '80 - 中等' },
  { value: '70', label: '70 - 及格' },
  { value: '60', label: '60 - 及格' },
  { value: '50', label: '50 - 不及格' },
  { value: '40', label: '40 - 不及格' },
  { value: '30', label: '30 - 不及格' },
  { value: '20', label: '20 - 不及格' },
  { value: '10', label: '10 - 不及格' },
  { value: '0', label: '0 - 不及格' },
];

export const SpotCheckForm: React.FC<SpotCheckFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { currentRole } = useAuth();
  
  // Form state
  const [studentId, setStudentId] = React.useState<string>('');
  const [content, setContent] = React.useState('');
  const [score, setScore] = React.useState<string>('');
  const [comment, setComment] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  // Determine which students to show based on role
  // Requirements: 16.4 - 导师仅展示其名下学员供选择
  // Requirements: 16.5 - 室经理仅展示本室学员供选择
  const isMentor = currentRole === ROLE_CODES.MENTOR;
  const isDeptManager = currentRole === ROLE_CODES.DEPT_MANAGER;
  
  // Fetch students based on role
  const { 
    data: mentees, 
    isLoading: menteesLoading 
  } = useMentees();
  
  const { 
    data: deptMembers, 
    isLoading: deptMembersLoading 
  } = useDepartmentMembers();
  
  // Get the appropriate student list based on role
  const students = React.useMemo(() => {
    if (isMentor) {
      return mentees || [];
    }
    if (isDeptManager) {
      return deptMembers || [];
    }
    return [];
  }, [isMentor, isDeptManager, mentees, deptMembers]);
  
  const isLoadingStudents = isMentor ? menteesLoading : deptMembersLoading;
  
  // Student options for select
  const studentOptions = React.useMemo(() => {
    return students.map(student => ({
      value: String(student.id),
      label: `${student.real_name} (${student.employee_id})`,
    }));
  }, [students]);
  
  // Create mutation
  const createMutation = useCreateSpotCheck();
  
  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!studentId) {
      newErrors.studentId = '请选择被抽查学员';
    }
    
    if (!content.trim()) {
      newErrors.content = '请填写抽查内容';
    } else if (content.trim().length < 5) {
      newErrors.content = '抽查内容至少需要5个字符';
    }
    
    if (!score) {
      newErrors.score = '请选择评分';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const data: CreateSpotCheckRequest = {
      student_id: parseInt(studentId, 10),
      content: content.trim(),
      score: parseInt(score, 10),
      comment: comment.trim() || undefined,
    };
    
    try {
      await createMutation.mutateAsync(data);
      // Reset form
      setStudentId('');
      setContent('');
      setScore('');
      setComment('');
      setErrors({});
      onSuccess?.();
    } catch {
      // Error is handled by mutation
    }
  };
  
  /**
   * Handle reset
   */
  const handleReset = () => {
    setStudentId('');
    setContent('');
    setScore('');
    setComment('');
    setErrors({});
    onCancel?.();
  };
  
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <ClipboardCheck className="text-emerald-400" size={20} />
          </div>
          <div>
            <CardTitle>新建抽查记录</CardTitle>
            <CardDescription>
              录入线下抽查的评分记录
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <User size={16} className="text-text-muted" />
              被抽查学员 <span className="text-red-400">*</span>
            </label>
            {isLoadingStudents ? (
              <div className="flex items-center gap-2 text-text-muted">
                <Spinner size="sm" />
                <span>加载学员列表...</span>
              </div>
            ) : studentOptions.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertCircle size={16} />
                <span>
                  {isMentor ? '您名下暂无学员' : '本室暂无学员'}
                </span>
              </div>
            ) : (
              <Select
                value={studentId}
                onChange={(value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  setStudentId(newValue || '');
                  if (errors.studentId) {
                    setErrors(prev => ({ ...prev, studentId: '' }));
                  }
                }}
                options={[
                  { value: '', label: '请选择学员' },
                  ...studentOptions,
                ]}
                error={errors.studentId}
              />
            )}
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <FileText size={16} className="text-text-muted" />
              抽查内容 <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) {
                  setErrors(prev => ({ ...prev, content: '' }));
                }
              }}
              placeholder="请描述抽查的具体内容，如：抽查了哪些知识点、操作流程等"
              rows={4}
              error={errors.content}
            />
          </div>
          
          {/* Score */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <Star size={16} className="text-text-muted" />
              评分 <span className="text-red-400">*</span>
            </label>
            <Select
              value={score}
              onChange={(value) => {
                const newValue = Array.isArray(value) ? value[0] : value;
                setScore(newValue || '');
                if (errors.score) {
                  setErrors(prev => ({ ...prev, score: '' }));
                }
              }}
              options={[
                { value: '', label: '请选择评分' },
                ...SCORE_OPTIONS,
              ]}
              error={errors.score}
            />
            {score && (
              <div className="text-sm text-text-muted">
                当前评分：
                <span className={`font-medium ml-1 ${
                  parseInt(score) >= 80 ? 'text-emerald-400' :
                  parseInt(score) >= 60 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {score} 分
                </span>
              </div>
            )}
          </div>
          
          {/* Comment */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <MessageSquare size={16} className="text-text-muted" />
              评语 <span className="text-text-muted text-xs">（可选）</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入评语或建议..."
              rows={3}
            />
          </div>
          
          {/* Error Message */}
          {createMutation.isError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>
                {createMutation.error instanceof Error 
                  ? createMutation.error.message 
                  : '创建失败，请重试'}
              </span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || studentOptions.length === 0}
              loading={createMutation.isPending}
            >
              提交抽查记录
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

SpotCheckForm.displayName = 'SpotCheckForm';

export default SpotCheckForm;
