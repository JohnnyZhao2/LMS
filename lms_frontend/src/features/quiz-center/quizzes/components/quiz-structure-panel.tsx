import React from 'react';
import { AlertCircle, ChevronDown, ChevronUp, FileEdit, FileText, LayoutGrid, RefreshCw, SortAsc, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { AvatarCircle } from '@/components/common/avatar-circle';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/quiz-center/questions/constants';
import { cn } from '@/lib/utils';
import type { QuizQuestionItem } from '@/features/quiz-center/quizzes/types';

interface QuizStructurePanelProps {
  selectedQuestions: QuizQuestionItem[];
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void;
  onEditQuestion: (item: QuizQuestionItem) => void;
  onRemoveQuestion: (index: number) => void;
  onScoreChange: (id: number, score: string) => void;
  onSortQuestions?: () => void;
  onUpgradeQuestion?: (index: number, resourceUuid: string) => void;
}

export const QuizStructurePanel: React.FC<QuizStructurePanelProps> = ({
  selectedQuestions,
  onMoveQuestion,
  onEditQuestion,
  onRemoveQuestion,
  onScoreChange,
  onSortQuestions,
  onUpgradeQuestion,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-muted min-w-0">
      <div className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-foreground bg-background border-b border-border">
        <FileText className="w-4 h-4 text-primary-500" />
        试卷内容结构
        <Badge variant="secondary" className="ml-2 bg-muted">{selectedQuestions.length} 道题目</Badge>
        {selectedQuestions.length > 0 && onSortQuestions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSortQuestions}
            className="ml-auto text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 gap-1.5 h-7 px-2"
          >
            <SortAsc className="w-3.5 h-3.5" />
            一键排序
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <LayoutGrid className="w-16 h-16 mb-4 text-text-muted" />
            <span className="text-base">从左侧题库点击添加到试卷</span>
          </div>
        ) : (
          <div className="relative w-full max-w-[560px] mx-auto pl-12">
            {selectedQuestions.length > 1 && (
              <div
                className="absolute left-[17px] top-[18px] w-0.5 bg-muted"
                style={{ height: `calc(100% - 36px)` }}
              />
            )}
            <div className="space-y-4">
              {selectedQuestions.map((item, idx) => (
                <div key={item.id} className="relative flex gap-4 animate-fadeInUp">
                  <div className="absolute -left-12 top-0 flex flex-col items-center">
                    <AvatarCircle size="md" text={String(idx + 1)} />
                  </div>
                  <div
                    className={cn(
                      "flex-1 flex flex-col gap-2 p-4 bg-background border rounded-xl transition-all",
                      item.is_current === false ? "border-warning-300 bg-warning-50/30" : "border-border hover:border-primary-300"
                    )}
                  >
                    {item.is_current === false && (
                      <div className="flex items-center gap-2 text-xs text-warning-600 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>题目有新版本</span>
                        {onUpgradeQuestion && (
                          <Tooltip title="替换为最新版本">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-xs text-warning-700 hover:text-warning-800 hover:bg-warning-100"
                              onClick={() => onUpgradeQuestion(idx, item.resource_uuid)}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              升级
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("text-[10px] px-1.5", getQuestionTypeStyle(item.question_type).bg, getQuestionTypeStyle(item.question_type).color)}>
                            {getQuestionTypeLabel(item.question_type)}
                          </Badge>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={Number(item.score)}
                            onChange={(e) => onScoreChange(item.id, e.target.value)}
                            className="w-16 h-6 text-xs text-center"
                          />
                          <span className="text-xs text-text-muted">分</span>
                        </div>
                        <div className="text-sm text-foreground line-clamp-3">{item.content}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => onMoveQuestion(idx, 'up')}>
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === selectedQuestions.length - 1} onClick={() => onMoveQuestion(idx, 'down')}>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-500 hover:text-primary-600 hover:bg-primary-50" onClick={() => onEditQuestion(item)}>
                          <FileEdit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="从试卷移除"
                          className="h-8 w-8 text-text-muted hover:text-destructive-500 hover:bg-destructive-50"
                          onClick={() => onRemoveQuestion(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
