import React from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QuizOutlinePanel } from '@/features/quiz-center/quizzes/components/quiz-outline-panel';
import { showApiError } from '@/utils/error-handler';
import type { Question, QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { QuestionDocumentList } from './question-document-list';
import {
  buildQuestionCreatePayload,
  buildQuestionPatchPayload,
  createBlankEditableQuestion,
  hasQuestionAnswer,
  syncEditableQuestionItem,
  type EditableQuestionItem,
} from './question-editor-helpers';

interface QuestionBatchEditorProps {
  initialItems: EditableQuestionItem[];
  spaceTypes?: Tag[];
  allowAdd?: boolean;
  onCreateQuestion: (data: QuestionCreateRequest) => Promise<Question>;
  onUpdateQuestion: (id: number, data: Partial<QuestionCreateRequest>) => Promise<Question>;
  onDeleteQuestion: (id: number) => Promise<void>;
  onChanged?: () => void;
  onEmpty?: () => void;
}

export const QuestionBatchEditor: React.FC<QuestionBatchEditorProps> = ({
  initialItems,
  spaceTypes,
  allowAdd = false,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onChanged,
  onEmpty,
}) => {
  const [items, setItems] = React.useState<EditableQuestionItem[]>(initialItems);
  const [activeKey, setActiveKey] = React.useState<string | null>(initialItems[0]?.key ?? null);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [deletingKey, setDeletingKey] = React.useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = React.useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  const replaceItem = React.useCallback((key: string, updater: (current: EditableQuestionItem) => EditableQuestionItem) => {
    setItems((prev) => prev.map((item) => (item.key === key ? updater(item) : item)));
  }, []);

  const removeItem = React.useCallback((key: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.key !== key);
      if (next.length === 0) {
        if (allowAdd) {
          const blank = createBlankEditableQuestion();
          queueMicrotask(() => setActiveKey(blank.key));
          return [blank];
        }
        queueMicrotask(() => onEmpty?.());
        return next;
      }
      queueMicrotask(() => setActiveKey((current) => (current === key ? next[0]?.key ?? null : current)));
      return next;
    });
  }, [allowAdd, onEmpty]);

  const handleSave = React.useCallback(async (item: EditableQuestionItem) => {
    if (!item.content.trim()) {
      toast.error('请输入内容');
      return;
    }
    if (!hasQuestionAnswer(item.answer)) {
      toast.error('请设置答案');
      return;
    }

    setSavingKey(item.key);
    try {
      if (!item.questionId) {
        const created = await onCreateQuestion(buildQuestionCreatePayload(item));
        replaceItem(item.key, () => syncEditableQuestionItem(item, created));
        toast.success('题目创建成功');
        onChanged?.();
        return;
      }

      const patch = buildQuestionPatchPayload(item.original ?? {}, buildQuestionCreatePayload(item));
      if (Object.keys(patch).length === 0) {
        toast.info('未检测到改动');
        return;
      }

      const updated = await onUpdateQuestion(item.questionId, patch);
      replaceItem(item.key, () => syncEditableQuestionItem(item, updated));
      toast.success('题目保存成功');
      onChanged?.();
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingKey(null);
    }
  }, [onChanged, onCreateQuestion, onUpdateQuestion, replaceItem]);

  const handleSaveByKey = React.useCallback((key: string) => {
    const item = items.find((current) => current.key === key);
    if (item) {
      void handleSave(item);
    }
  }, [handleSave, items]);

  const handleConfirmDelete = React.useCallback(async () => {
    const target = items.find((item) => item.key === confirmDeleteKey);
    if (!target) {
      setConfirmDeleteKey(null);
      return;
    }

    setDeletingKey(target.key);
    try {
      if (target.questionId) {
        await onDeleteQuestion(target.questionId);
        toast.success('题目已删除');
        onChanged?.();
      }
      removeItem(target.key);
      setConfirmDeleteKey(null);
    } catch (error) {
      showApiError(error);
    } finally {
      setDeletingKey(null);
    }
  }, [confirmDeleteKey, items, onChanged, onDeleteQuestion, removeItem]);

  const handleAddBlank = React.useCallback((questionType: QuestionType) => {
    const blank = createBlankEditableQuestion(questionType);
    setItems((prev) => [...prev, blank]);
    setActiveKey(blank.key);
    setShowAddMenu(false);
  }, []);

  const handleReorderItems = React.useCallback((fromKey: string, toKey: string) => {
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.key === fromKey);
      const newIndex = prev.findIndex((item) => item.key === toKey);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  return (
    <>
      <div className="grid h-full min-w-0 gap-3 [grid-template-columns:minmax(17rem,18rem)_minmax(0,1fr)] 2xl:[grid-template-columns:minmax(20rem,20rem)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
          <QuizOutlinePanel
            title="题目结构"
            items={items}
            activeKey={activeKey}
            quizType="PRACTICE"
            onSelectItem={setActiveKey}
            onReorderItems={handleReorderItems}
            onDurationChange={() => undefined}
            onPassScoreChange={() => undefined}
          />
        </div>

        <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
          <QuestionDocumentList
            items={items}
            activeKey={activeKey}
            spaceTypes={spaceTypes}
            onChangeItem={(key, patch) => replaceItem(key, (current) => ({ ...current, ...patch, saved: false }))}
            onSelectItem={setActiveKey}
            onReorderItems={handleReorderItems}
            onSaveItem={handleSaveByKey}
            onDeleteItem={setConfirmDeleteKey}
            itemSavingKey={savingKey}
            itemDeletingKey={deletingKey}
            addMenuOpen={showAddMenu}
            onAddMenuOpenChange={allowAdd ? setShowAddMenu : undefined}
            onAddQuestion={allowAdd ? handleAddBlank : undefined}
          />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDeleteKey)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteKey(null);
        }}
        title="确认删除题目？"
        description="删除后无法恢复。已保存题目会从题库中删除，未保存题目会直接从当前编辑区移除。"
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isConfirming={Boolean(deletingKey)}
      />
    </>
  );
};
