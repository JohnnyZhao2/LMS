import React from 'react';
import { Calendar, Circle, PencilLine, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

import { useUpdateQuestion } from '@/features/questions/api/create-question';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import { QuestionPreviewSurface } from '@/features/questions/components/question-preview-surface';
import { TagInput } from '@/features/knowledge/components/shared/tag-input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { getQuestionTypeLabel } from '@/features/questions/constants';
import dayjs from '@/lib/dayjs';
import { showApiError } from '@/utils/error-handler';
import type { Question } from '@/types/api';

interface QuestionDetailDialogProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
}

export const QuestionDetailDialog: React.FC<QuestionDetailDialogProps> = ({
  question,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}) => {
  const [showSpaceInfo, setShowSpaceInfo] = React.useState(false);
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [previewQuestion, setPreviewQuestion] = React.useState<Question | null>(question);
  const [activeTags, setActiveTags] = React.useState(() => question?.tags ?? []);
  const [activeSpaceTag, setActiveSpaceTag] = React.useState<Question['space_tag'] | null>(() => question?.space_tag ?? null);
  const updateQuestion = useUpdateQuestion();
  const { data: spaceTypes = [] } = useSpaceTypeTags();

  React.useEffect(() => {
    setPreviewQuestion(question);
    setActiveTags(question?.tags ?? []);
    setActiveSpaceTag(question?.space_tag ?? null);
  }, [question]);

  React.useEffect(() => {
    if (!open) {
      setShowSpaceInfo(false);
      setShowTagInput(false);
    }
  }, [open]);

  if (!question) {
    return null;
  }

  const syncTags = async (nextTagIds: number[], nextTags: typeof activeTags) => {
    try {
      await updateQuestion.mutateAsync({
        id: question.id,
        data: { tag_ids: nextTagIds },
      });
      setActiveTags(nextTags);
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
      setActiveSpaceTag(spaceTypes.find((item) => item.id === spaceTagId) ?? null);
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
      setPreviewQuestion((current) => (current ? { ...current, ...data } : current));
      toast.success('题目已更新');
    } catch (error) {
      showApiError(error);
    }
  };

  const activeQuestion = previewQuestion ?? question;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="flex h-[min(700px,84vh)] w-[min(1180px,84vw)] max-w-none gap-3 overflow-hidden rounded-[6px] border-0 bg-[#f1f3f6] p-3 shadow-[0_32px_84px_rgba(0,0,0,0.28)]"
      >
        <ScrollContainer className="flex min-h-0 flex-1 flex-col rounded-[6px] bg-white px-[40px] py-[32px] shadow-[0_10px_24px_rgba(21,38,61,0.07)]">
          <div className="mx-auto flex min-h-full w-full max-w-[960px] items-center justify-center">
            <QuestionPreviewSurface
              question={activeQuestion}
              editable
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
                {getQuestionTypeLabel(question.question_type)}
              </h2>
            </div>
          </div>

          <ScrollContainer className="flex-1">
            <div className="flex h-full flex-col px-5 py-[18px]">
              <div className="mb-[18px]">
                <p className="mb-[10px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#a0a8b0]">标签</p>
                {showTagInput ? (
                  <TagInput
                    applicableTo="question"
                    selectedTags={activeTags}
                    onAdd={(tag) => {
                      void syncTags(
                        [...new Set([...activeTags.map((item) => item.id), tag.id])],
                        [...activeTags, tag],
                      );
                    }}
                    onRemove={(tagId) => {
                      void syncTags(
                        activeTags.filter((item) => item.id !== tagId).map((item) => item.id),
                        activeTags.filter((item) => item.id !== tagId),
                      );
                    }}
                    hideChips
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-[7px]">
                  <button
                    type="button"
                    onClick={() => setShowTagInput((value) => !value)}
                    className="inline-flex items-center gap-1 rounded-[100px] bg-[#e8793a] px-[14px] py-[5px] text-[12px] font-semibold text-white transition hover:bg-[#d66b2e]"
                  >
                    <Plus className="h-3 w-3" strokeWidth={2.2} />
                    添加标签
                  </button>
                  {activeTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-[5px] rounded-[100px] bg-[#e0e3e8] px-[11px] py-1 text-[12px] text-[#555]"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => {
                          void syncTags(
                            activeTags.filter((item) => item.id !== tag.id).map((item) => item.id),
                            activeTags.filter((item) => item.id !== tag.id),
                          );
                        }}
                        className="ml-[2px] text-[#98a4b5] transition hover:text-[#666]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
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
                    <span>{question.created_by_name || '系统'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{question.updated_by_name || question.created_by_name || '系统'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-[14px] w-[14px] shrink-0 text-[#aaa]" />
                    <span>{dayjs(question.updated_at).format('YYYY-MM-DD HH:mm')}</span>
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
                  <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 border-[#ccc]">
                    {!activeSpaceTag ? <span className="h-[5px] w-[5px] rounded-full bg-[#e8793a]" /> : null}
                  </span>
                  未设置空间
                </button>
                {spaceTypes.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => { void syncSpace(space.id); }}
                    className="flex w-full items-center gap-[10px] px-4 py-3 text-left text-[13.5px] text-[#333] transition hover:bg-[#f9f9f9]"
                    style={{ background: activeSpaceTag?.id === space.id ? '#f0f4ff' : 'none' }}
                  >
                    <span
                      className="flex h-[14px] w-[14px] items-center justify-center rounded-full border-2"
                      style={{ borderColor: activeSpaceTag?.id === space.id ? '#e8793a' : '#ccc' }}
                    >
                      {activeSpaceTag?.id === space.id ? <span className="h-[5px] w-[5px] rounded-full bg-[#e8793a]" /> : null}
                    </span>
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
                onClick={() => onEdit(question)}
              >
                <PencilLine className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 text-[#e44] transition hover:text-[#e44]"
                title="删除题目"
                onClick={() => onDelete(question)}
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
