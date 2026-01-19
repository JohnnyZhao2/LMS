"use client"

import React from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuizDetail } from '@/types/api';

interface QuizFormHeaderProps {
  isEdit: boolean;
  quizData?: QuizDetail;
  title: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const QuizFormHeader: React.FC<QuizFormHeaderProps> = ({
  isEdit,
  quizData,
  title,
  onTitleChange,
  onBack,
  onCancel,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="flex items-center h-16 px-6 bg-white border-b border-gray-200 shrink-0 gap-4">
      <div className="flex items-center gap-4 shrink-0">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2.5 px-3 h-10 text-gray-600 hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-semibold">返回列表</span>
        </Button>
        <div className="w-px h-5 bg-gray-200" />
      </div>

      <div className="flex-1 min-w-0">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入试卷标题..."
          className="text-lg font-semibold h-10 border border-gray-200 bg-white rounded-lg px-4 shadow-sm hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
        />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isEdit && quizData && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{quizData.updated_by_name || quizData.created_by_name}</span>
            <span>·</span>
            <span>{new Date(quizData.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="px-5 font-semibold">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          完成并提交
        </Button>
      </div>
    </div>
  );
};
