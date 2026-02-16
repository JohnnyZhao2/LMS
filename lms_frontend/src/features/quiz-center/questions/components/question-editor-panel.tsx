import React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QUESTION_TYPE_LABELS } from '@/features/quiz-center/questions/constants';
import type { QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { AnswerInput, OptionsInput } from './question-form-inputs';

interface QuestionEditorPanelProps {
  questionForm: Partial<QuestionCreateRequest>;
  setQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>>;
  lineTypes?: Tag[];
  editingQuestionId: number | null;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  readOnly?: boolean;
  showActions?: boolean;
}

export const QuestionEditorPanel: React.FC<QuestionEditorPanelProps> = ({
  questionForm,
  setQuestionForm,
  lineTypes,
  editingQuestionId,
  onCancel,
  onSave,
  isSaving,
  readOnly = false,
  showActions = true,
}) => {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <Label>题目类别与题型</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={questionForm.line_tag_id?.toString()}
            onValueChange={val => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, line_tag_id: Number(val) }));
            }}
          >
            <SelectTrigger disabled={readOnly}><SelectValue placeholder="选择所属条线" /></SelectTrigger>
            <SelectContent>
              {lineTypes?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={questionForm.question_type || 'SINGLE_CHOICE'}
            onValueChange={val => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, question_type: val as QuestionType }));
            }}
            disabled={!!editingQuestionId || readOnly}
          >
            <SelectTrigger><SelectValue placeholder="题型" /></SelectTrigger>
            <SelectContent>
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>题目核心内容</Label>
        <Textarea
          placeholder="输入题目内容..."
          value={questionForm.content}
          onChange={e => {
            if (readOnly) return;
            setQuestionForm(prev => ({ ...prev, content: e.target.value }));
          }}
          className="min-h-[100px]"
          readOnly={readOnly}
        />
      </div>

      {(questionForm.question_type === 'SINGLE_CHOICE' || questionForm.question_type === 'MULTIPLE_CHOICE') ? (
        <div className="space-y-2">
          <Label className="text-primary-600">备选项与正确答案</Label>
          <OptionsInput
            questionType={questionForm.question_type as QuestionType}
            value={questionForm.options || []}
            onChange={opts => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, options: opts }));
            }}
            answer={questionForm.answer || ''}
            onAnswerChange={ans => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, answer: ans }));
            }}
            disabled={readOnly}
          />
          <p className="text-[10px] text-text-muted mt-1 italic">* 点击选项前的图标即可直接设置该项为正确答案</p>
        </div>
      ) : (
        <div className="space-y-2 p-3 bg-secondary-50/50 rounded-xl border border-secondary-100">
          <Label className="text-secondary-700">标准正确答案</Label>
          <AnswerInput
            questionType={questionForm.question_type as QuestionType}
            options={questionForm.options || []}
            value={questionForm.answer || ''}
            onChange={ans => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, answer: ans }));
            }}
            disabled={readOnly}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>考点解析</Label>
        <Textarea
          placeholder="提供给学员的解析内容..."
          value={questionForm.explanation}
          onChange={e => {
            if (readOnly) return;
            setQuestionForm(prev => ({ ...prev, explanation: e.target.value }));
          }}
          className="h-20"
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">默认分值</Label>
          <Input
            type="number"
            value={questionForm.score}
            onChange={e => {
              if (readOnly) return;
              setQuestionForm(prev => ({ ...prev, score: e.target.value }));
            }}
            readOnly={readOnly}
          />
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>放弃编辑</Button>
          <Button className="flex-1 bg-secondary-600 hover:bg-secondary-700" onClick={onSave}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : '完成并同步'}
          </Button>
        </div>
      )}
    </div>
  );
};