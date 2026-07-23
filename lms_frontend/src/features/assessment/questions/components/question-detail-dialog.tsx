import React from 'react';
import { Calendar, Circle, PencilLine, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

import { SelectionIndicator } from '@/components/common/selection-indicator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { useQuestionDetail, useUpdateQuestion } from '@/features/assessment/api/questions-queries';
import { QuestionDocumentReadMode } from '@/features/assessment/questions/components/question-document-read-mode';
import { getQuestionTypeLabel } from '@/features/assessment/questions/config';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';
import { showApiError } from '@/lib/api-error-handler';
import { formatListDateTime } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/question';

interface QuestionDetailDialogProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
  tagDeps: AssessmentTagDeps;
}

type EditingField = 'content' | 'explanation' | `option:${number}` | null;

/**
 * 题目详情预览：支持题干 / 解析 / 选项的就地编辑。
 */
const QuestionDetailPreview: React.FC<{
  question: Question;
  className?: string;
  saving?: boolean;
  onSaveContent?: (content: string) => Promise<void> | void;
  onSaveExplanation?: (explanation: string) => Promise<void> | void;
  onSaveOption?: (index: number, value: string) => Promise<void> | void;
}> = ({
  question,
  className,
  saving = false,
  onSaveContent,
  onSaveExplanation,
  onSaveOption,
}) => {
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const options = question.options ?? [];

  React.useEffect(() => {
    setEditingField(null);
  }, [question.id, question.updated_at]);

  const commitEditing = async (
    field: Exclude<EditingField, null>,
    nextValue: string,
    currentValue: string,
  ) => {
    const normalized = nextValue.trim();
    if (normalized === currentValue.trim()) {
      setEditingField(null);
      return;
    }

    if (field === 'content') {
      if (onSaveContent) {
        await onSaveContent(normalized);
      }
      setEditingField(null);
      return;
    }

    if (field === 'explanation') {
      if (onSaveExplanation) {
        await onSaveExplanation(normalized);
      }
      setEditingField(null);
      return;
    }

    const index = Number(field.split(':')[1]);
    if (!Number.isNaN(index) && onSaveOption) {
      await onSaveOption(index, normalized);
    }
    setEditingField(null);
  };

  const cancelEditing = (element: HTMLDivElement, value: string) => {
    element.textContent = value;
    setEditingField(null);
    if (document.activeElement === element) {
      element.blur();
    }
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLDivElement>,
    field: Exclude<EditingField, null>,
    value: string,
    multiline?: boolean,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      await commitEditing(field, event.currentTarget.textContent ?? '', value);
      event.currentTarget.blur();
      return;
    }

    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      await commitEditing(field, event.currentTarget.textContent ?? '', value);
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing(event.currentTarget, value);
    }
  };

  const renderEditableText = (
    field: Exclude<EditingField, null>,
    value: string,
    placeholder: string,
    textClassName: string,
    multiline = false,
  ) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setEditingField(field)}
      onBlur={(event) => { void commitEditing(field, event.currentTarget.textContent ?? '', value); }}
      onKeyDown={(event) => { void handleKeyDown(event, field, value, multiline); }}
      className={cn(
        'block w-full min-w-0 max-w-full bg-transparent outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9aa6b2]',
        'whitespace-pre-wrap break-all cursor-text',
        textClassName,
        editingField === field && 'text-foreground',
      )}
      data-placeholder={placeholder}
    >
      {value}
    </div>
  );

  return (
    <QuestionDocumentReadMode
      mode="preview"
      className={cn('w-full rounded-none border-0 bg-transparent', className)}
      compactWidth={720}
      saving={saving}
      explanationLayout="bottom"
      questionType={question.question_type}
      content={question.content}
      options={options}
      answer={question.answer ?? ''}
      explanation={question.explanation ?? ''}
      showExplanation
      contentRenderer={({ value, placeholder, className: textClassName }) => (
        renderEditableText('content', value, placeholder, textClassName, true)
      )}
      explanationRenderer={({ value, placeholder, className: textClassName }) => (
        <div className="rounded-xl bg-muted/30 px-4 py-3">
          {renderEditableText('explanation', value, placeholder, textClassName, true)}
        </div>
      )}
      optionLabelRenderer={(option, index) => (
        renderEditableText(
          `option:${index}`,
          option.value || '',
          '未填写选项内容',
          'flex min-h-[20px] items-center whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-foreground',
        )
      )}
    />
  );
};

export const QuestionDetailDialog: React.FC<QuestionDetailDialogProps> = ({
  question,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  tagDeps,
}) => {
  const [showSpaceInfo, setShowSpaceInfo] = React.useState(false);
  const [showTagInput, setShowTagInput] = React.useState(false);
  const updateQuestion = useUpdateQuestion();
  const { useTags, TagAssignmentSection } = tagDeps;
  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });
  const { data: detailQuestion } = useQuestionDetail(question?.id ?? 0);

  React.useEffect(() => {
    if (!open) {
      setShowSpaceInfo(false);
      setShowTagInput(false);
    }
  }, [open]);

  if (!question) {
    return null;
  }

  const activeQuestion = detailQuestion ?? question;
  const activeTags = activeQuestion.tags ?? [];
  const activeSpaceTag = activeQuestion.space_tag ?? null;

  const syncTags = async (nextTagIds: number[]) => {
    try {
      await updateQuestion.mutateAsync({
        id: question.id,
        data: { tag_ids: nextTagIds },
      });
      toast.success('标签已更新');
    } catch (error) {
      showApiError(error);
    }
  };

  const syncSpace = async (spaceTagId: number | null) => {
    try {
      await updateQuestion.mutateAsync({
        id: question.id,
        data: { space_tag_id: spaceTagId },
      });
      setShowSpaceInfo(false);
      toast.success('空间已更新');
    } catch (error) {
      showApiError(error);
    }
  };

  const syncPreviewQuestion = async (data: Partial<Pick<Question, 'content' | 'options' | 'explanation'>>) => {
    try {
      await updateQuestion.mutateAsync({
        id: question.id,
        data,
      });
      toast.success('题目已更新');
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="flex h-[min(700px,84vh)] w-[min(1180px,84vw)] max-w-none gap-3 overflow-hidden rounded-[6px] border-0 bg-[#f1f3f6] p-3 shadow-[0_32px_84px_rgba(0,0,0,0.28)]"
      >
        <ScrollContainer className="flex min-h-0 flex-1 flex-col rounded-[6px] bg-white px-[40px] py-[32px] shadow-[0_10px_24px_rgba(21,38,61,0.07)]">
          <div className="mx-auto flex min-h-full w-full max-w-[960px] items-center justify-center">
            <QuestionDetailPreview
              question={activeQuestion}
              saving={updateQuestion.isPending}
              className="w-full"
              onSaveContent={async (content) => {
                await syncPreviewQuestion({ content });
              }}
              onSaveExplanation={async (explanation) => {
                await syncPreviewQuestion({ explanation });
              }}
              onSaveOption={async (index, value) => {
                const nextOptions = (activeQuestion.options ?? []).map((item, itemIndex) => (
                  itemIndex === index ? { ...item, value } : item
                ));
                await syncPreviewQuestion({ options: nextOptions });
              }}
            />
          </div>
        </ScrollContainer>

        <div className="relative flex min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-[6px] bg-[#eef2f6] shadow-[0_10px_24px_rgba(21,38,61,0.08)]">
          <div className="bg-[linear-gradient(160deg,#dce4ee_0%,#eef0f3_100%)] px-5 pb-4 pt-[22px]">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[16px] font-normal leading-[1.3] tracking-[-0.01em] text-[#6a7a8a]">
                {getQuestionTypeLabel(activeQuestion.question_type)}
              </h2>
            </div>
          </div>

          <ScrollContainer className="flex-1">
            <div className="flex h-full flex-col px-5 py-[18px]">
              <div className="mb-[18px]">
                <TagAssignmentSection
                  applicableTo="question"
                  selectedTags={activeTags}
                  expanded={showTagInput}
                  onExpandedChange={setShowTagInput}
                  onAdd={(tag) => {
                    void syncTags(
                      [...new Set([...activeTags.map((item) => item.id), tag.id])],
                    );
                  }}
                  onRemove={(tagId) => {
                    void syncTags(
                      activeTags.filter((item) => item.id !== tagId).map((item) => item.id),
                    );
                  }}
                />
              </div>

              <div className="mb-[18px]">
                <p className="mb-[10px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#a0a8b0]">详细信息</p>
                <div className="flex flex-col gap-2 text-[12px] text-[#777]">
                  <div className="flex items-center gap-2">
                    <Circle className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{activeSpaceTag?.name || '未设置空间'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{activeQuestion.created_by_name || '系统'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{activeQuestion.updated_by_name || activeQuestion.created_by_name || '系统'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{formatListDateTime(activeQuestion.updated_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1" />
            </div>
          </ScrollContainer>

          <div className="relative flex items-center justify-center px-5 pb-4 pt-[14px]">
            {showSpaceInfo ? (
              <div className="absolute bottom-[calc(100%+8px)] left-5 right-5 z-10 overflow-hidden rounded-[6px] bg-white shadow-[0_-4px_28px_rgba(0,0,0,0.13)]">
                <button
                  type="button"
                  onClick={() => { void syncSpace(null); }}
                  className="flex w-full items-center gap-[10px] px-4 py-3 text-left text-[13.5px] text-[#333] transition hover:bg-[#f9f9f9]"
                >
                  <SelectionIndicator color="#ccc" selected={!activeSpaceTag} size={14} dotSize={5} />
                  未设置空间
                </button>
                {spaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => { void syncSpace(space.id); }}
                    className="flex w-full items-center gap-[10px] px-4 py-3 text-left text-[13.5px] text-[#333] transition hover:bg-[#f9f9f9]"
                    style={{ background: activeSpaceTag?.id === space.id ? '#f0f4ff' : 'none' }}
                  >
                    <SelectionIndicator
                      color={activeSpaceTag?.id === space.id ? '#e8793a' : '#ccc'}
                      selected={activeSpaceTag?.id === space.id}
                      size={14}
                      dotSize={5}
                    />
                    {space.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-6">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 text-[#9aa0aa] transition hover:text-[#555]"
                title="查看空间"
                onClick={() => setShowSpaceInfo((value) => !value)}
              >
                <Circle className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 text-[#9aa0aa] transition hover:text-[#555]"
                title="编辑题目"
                onClick={() => onEdit(activeQuestion)}
              >
                <PencilLine className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 text-[#e44] transition hover:text-[#e44]"
                title="删除题目"
                onClick={() => onDelete(activeQuestion)}
              >
                <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
