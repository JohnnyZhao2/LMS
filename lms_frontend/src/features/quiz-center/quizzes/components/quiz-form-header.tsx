"use client"

import React from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface QuizFormHeaderProps {
  isEdit: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const QuizFormHeader: React.FC<QuizFormHeaderProps> = ({
  isEdit,
  onBack,
  onCancel,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-600 hover:text-primary-500">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-px h-5 bg-gray-200" />
        <h1 className="text-lg font-semibold text-gray-900">{isEdit ? '编辑试卷' : '创建全新试卷'}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={onSubmit} className="px-5 font-semibold">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          完成并提交
        </Button>
      </div>
    </div>
  );
};
