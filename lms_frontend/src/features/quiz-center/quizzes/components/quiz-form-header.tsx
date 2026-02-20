import React from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuizDetail, QuizType } from '@/types/api';

interface QuizFormHeaderProps {
  isEdit: boolean;
  quizData?: QuizDetail;
  title: string;
  quizType: QuizType;
  onTitleChange: (title: string) => void;
  onQuizTypeChange: (quizType: QuizType) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const QuizFormHeader: React.FC<QuizFormHeaderProps> = ({
  isEdit,
  quizData,
  title,
  quizType,
  onTitleChange,
  onQuizTypeChange,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="flex items-start justify-between shrink-0 gap-6">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-14 w-14 rounded-2xl text-text-muted hover:text-primary-500 hover:bg-primary-50 shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <div className="flex flex-col flex-1 min-w-0 justify-center h-14">
          <div className="flex items-center gap-3 mb-0.5 px-0.5">
            <span
              className={
                quizType === 'EXAM'
                  ? 'px-2 py-0.5 text-[10px] font-black tracking-wider rounded bg-destructive-500/10 text-destructive-600 uppercase'
                  : 'px-2 py-0.5 text-[10px] font-black tracking-wider rounded bg-primary-500/10 text-primary-600 uppercase'
              }
            >
              {quizType === 'EXAM' ? 'EXAM MODE' : 'PRACTICE MODE'}
            </span>
            {isEdit && quizData && (
              <span className="text-xs font-mono font-medium text-text-muted tracking-tight">
                ASSET_ID: {quizData.id.toString().padStart(4, '0')}
              </span>
            )}
            {isEdit && quizData && (
              <div className="flex items-center gap-2 text-xs text-text-muted/60">
                <span>·</span>
                <span>{quizData.updated_by_name || quizData.created_by_name}</span>
                <span>{new Date(quizData.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入试卷标题..."
            className="text-2xl sm:text-3xl font-bold h-9 border-transparent bg-transparent px-0 hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none rounded-none placeholder:text-text-muted/40"
          />
        </div>
      </div>

      <div className="flex items-center p-1.5 bg-background border border-border rounded-xl shadow-sm shrink-0 gap-3 h-14">
        <div className="flex p-1 bg-muted rounded-lg shrink-0 h-full">
          <button
            className={
              quizType === 'PRACTICE'
                ? 'px-4 h-full text-xs font-semibold rounded-md bg-background text-primary-600 shadow-sm transition-all'
                : 'px-4 h-full text-xs font-semibold rounded-md text-text-muted hover:text-foreground transition-all'
            }
            onClick={() => onQuizTypeChange('PRACTICE')}
            type="button"
          >
            练习
          </button>
          <button
            className={
              quizType === 'EXAM'
                ? 'px-4 h-full text-xs font-semibold rounded-md bg-destructive-500 text-white shadow-sm transition-all'
                : 'px-4 h-full text-xs font-semibold rounded-md text-text-muted hover:text-foreground transition-all'
            }
            onClick={() => onQuizTypeChange('EXAM')}
            type="button"
          >
            考试
          </button>
        </div>
        <Button onClick={onSubmit} disabled={isSubmitting} className="h-full px-5 font-semibold rounded-lg shadow-sm">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          完成并提交
        </Button>
      </div>
    </div>
  );
};
